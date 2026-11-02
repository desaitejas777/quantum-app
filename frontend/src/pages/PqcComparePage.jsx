import React, { useEffect, useState } from 'react';
import { pqcAdvisorApi } from '../services/pqcAdvisorApi';

const SECTIONS = [
  { id: 'overview', label: 'Overview', index: '01' },
  { id: 'advisor', label: 'Algorithm advisor', index: '02' },
  { id: 'algorithms', label: 'Algorithm comparison', index: '03' },
  { id: 'organization', label: 'Who should act', index: '04' },
  { id: 'hosting', label: 'Intranet hosting', index: '05' },
];

const DEFAULT_PICKER = { task: '', priority: '', footprint: '' };
const WHAT_NEXT = [
  'Inventory affected systems, protocols, certificates, and vendors.',
  'Confirm use-case and compatibility needs with IT and security.',
  'Pilot a supported implementation; test interoperability and performance.',
  'Plan key management, monitoring, ownership, and rollback.',
];

const COMPARISONS = [
  {
    category: 'Key establishment',
    current: {
      name: 'ECDH P-256 key agreement',
      explanation: 'A widely supported network key exchange; P-256 identifies the curve.',
      input: 'Your private key and the other party’s public key.',
      output: 'Both parties derive the same secret; it is never sent.',
      strength: 'Fast, compact, and widely supported. Ephemeral ECDH can protect past sessions if a long-term key is exposed.',
      drawback: 'A capable quantum computer could recover keys from recorded exchanges.',
    },
    next: {
      name: 'ML-KEM-768 with a hybrid rollout',
      explanation: 'A standardized way to establish a quantum-resistant shared secret.',
      standard: 'NIST FIPS 203',
      input: 'Recipient public key and fresh encapsulation randomness',
      output: 'A shared secret plus a ciphertext sent to the recipient',
      drawback: 'Larger messages; test library, protocol, and key lifecycle support.',
      benefit: 'Designed to resist known quantum attacks; hybrid rollout retains classical exchange during transition.',
    },
  },
  {
    category: 'Digital signatures',
    current: {
      name: 'ECDSA P-256',
      explanation: 'A widely used algorithm for signing and verifying data.',
      input: 'Private signing key and a message digest',
      output: 'A compact signature verified with the public key',
      strength: 'Compact signatures with broad certificate, device, and software support.',
      drawback: 'A capable quantum computer could recover signing keys and undermine trust in signatures.',
    },
    next: {
      name: 'ML-DSA-65',
      explanation: 'A standardized post-quantum algorithm for signing and verifying data.',
      standard: 'NIST FIPS 204',
      input: 'Private signing key and a message',
      output: 'A post-quantum signature verified with the public key',
      drawback: 'Larger keys and signatures; test certificate, firmware, and vendor support.',
      benefit: 'Designed to resist known quantum attacks; used for signatures, certificates, and integrity checks.',
    },
  },
];

const ROLE_GUIDANCE = {
  HR: {
    title: 'People, identity, and communication',
    actions: ['Coordinate staff training for new signing and certificate workflows.', 'Align identity and joiner/leaver processes with IT.', 'Never collect cryptographic secrets or personal data in this tool.'],
  },
  IT: {
    title: 'Infrastructure and security operations',
    actions: ['Inventory TLS, VPNs, certificates, appliances, backups, and key services.', 'Prioritize long-lived confidential data and internet-facing systems.', 'Pilot hybrid key exchange; measure latency, message size, and interoperability.'],
  },
  Developer: {
    title: 'Applications and product engineering',
    actions: ['Find direct crypto calls; replace hard-coded algorithms with provider interfaces.', 'Test negotiation, certificate sizes, signing, mobile clients, and rollback.', 'Use maintained crypto libraries; never implement algorithms yourself.'],
  },
  Planning: {
    title: 'Portfolio, risk, and procurement',
    actions: ['Assign system owners; track vendor readiness, dependencies, and renewals.', 'Prioritize by data lifetime, exposure, impact, and replacement lead time.', 'Fund discovery and pilots; sequence upgrades with clear exit criteria.'],
  },
};

function AlgorithmPanel({ data, variant }) {
  const isModern = variant === 'modern';
  return (
    <article className={`pqc-algorithm ${isModern ? 'pqc-algorithm-modern' : ''}`}>
      <div className="pqc-algorithm-topline">
        <span className="pqc-algorithm-kind">{isModern ? 'POST-QUANTUM PATH' : 'CURRENT BASELINE'}</span>
        {data.standard && <span className="pqc-standard">{data.standard}</span>}
      </div>
      <h3>{data.name}</h3>
      <dl className="pqc-io-list">
        <div><dt>Input</dt><dd>{data.input}</dd></div>
        <div><dt>Output</dt><dd>{data.output}</dd></div>
      </dl>
      {data.explanation && <p className="pqc-algorithm-explanation">{data.explanation}</p>}
      {data.strength && (
        <div className="pqc-tradeoff pqc-tradeoff-strength">
          <span>Advantage today</span>
          <p>{data.strength}</p>
        </div>
      )}
      <div className="pqc-tradeoff pqc-tradeoff-before">
        <span>{isModern ? 'Tradeoff to plan for' : 'Drawback before migration'}</span>
        <p>{data.drawback}</p>
      </div>
      {data.benefit && (
        <div className="pqc-tradeoff pqc-tradeoff-after">
          <span>Improvement over current</span>
          <p>{data.benefit}</p>
        </div>
      )}
    </article>
  );
}

function ComparisonMetric({ label, score, detail }) {
  const measured = Number.isFinite(score);
  return (
    <div className="pqc-metric">
      <div className="pqc-metric-heading">
        <span>{label}</span>
        <strong>{measured ? `${Math.round(score)} / 100` : 'Not assessed'}</strong>
      </div>
      <div
        className={`pqc-metric-track${measured ? '' : ' is-unknown'}`}
        role="img"
        aria-label={measured ? `${label}: ${Math.round(score)} out of 100` : `${label}: not assessed by this tool`}
      >
        {measured && <span style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />}
      </div>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function CandidateComparison({ candidates, winner }) {
  const eligible = candidates.slice(0, 3);
  return (
    <section className="pqc-clean-card" aria-labelledby="pqc-comparison-title">
      <div className="pqc-clean-card-heading">
        <h3 id="pqc-comparison-title">Compare the options</h3>
        <p>Scores compare eligible benchmarks. Compatibility and effort are not measured.</p>
      </div>
      <div className="pqc-candidate-grid">
        {eligible.map(candidate => (
          <article className={`pqc-candidate${candidate.mechanism === winner.mechanism ? ' is-recommended' : ''}`} key={candidate.mechanism}>
            <div className="pqc-candidate-heading">
              <h4>{candidate.mechanism}</h4>
              {candidate.mechanism === winner.mechanism && <span>Best fit</span>}
            </div>
            <ComparisonMetric label="Security" score={candidate.criterion_scores.security} detail={`NIST category ${candidate.security_category}`} />
            <ComparisonMetric label="Performance" score={candidate.criterion_scores.speed} detail="Relative benchmark score; higher is better" />
            <ComparisonMetric label="Compatibility" detail="Check protocol, client, and vendor support" />
            <ComparisonMetric label="Implementation effort" detail="Depends on your systems and rollout" />
          </article>
        ))}
      </div>
    </section>
  );
}

function WhatNext({ onViewHosting }) {
  const [checked, setChecked] = useState([]);
  return (
    <section className="pqc-clean-card pqc-next-card" aria-labelledby="pqc-next-title">
      <div className="pqc-clean-card-heading">
        <h3 id="pqc-next-title">What next?</h3>
        <p>A starting checklist, not a deployment plan.</p>
      </div>
      <ul className="pqc-checklist">
        {WHAT_NEXT.map((step, index) => (
          <li key={step}>
            <label>
              <input
                type="checkbox"
                checked={checked.includes(index)}
                onChange={() => setChecked(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index])}
              />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="pqc-text-link" onClick={onViewHosting}>Read the intranet rollout guide</button>
      <p className="pqc-disclaimer">Use recommendations for evaluation only—not as security approval to deploy. Confirm with your security team.</p>
    </section>
  );
}

function RecommendationPanel({ assessment, onViewHosting }) {
  const { recommendation, ranking } = assessment;
  const winner = ranking[0];
  return (
    <div className="pqc-result" aria-live="polite">
      <section className="pqc-winner" aria-labelledby="pqc-winner-title">
        <span className="pqc-result-kicker">RECOMMENDED STARTING POINT</span>
        <h3 id="pqc-winner-title">{recommendation.mechanism}</h3>
        <p>{recommendation.standard}</p>
        <p className="pqc-winner-headline">{recommendation.headline}</p>
        <ul className="pqc-reasons">{recommendation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      </section>
      <CandidateComparison candidates={ranking} winner={winner} />
      <WhatNext key={recommendation.mechanism} onViewHosting={onViewHosting} />
    </div>
  );
}

function SignatureGuidance({ onViewHosting, priority, footprint }) {
  const priorityLabels = { security: 'security', performance: 'performance', simplicity: 'simplicity' };
  const footprintLabels = { small: 'small', medium: 'medium', large: 'large' };
  return (
    <div className="pqc-result" aria-live="polite">
      <section className="pqc-winner" aria-labelledby="pqc-signature-title">
        <span className="pqc-result-kicker">LEARNING STARTING POINT · NOT BENCHMARK-RANKED</span>
        <h3 id="pqc-signature-title">Explore ML-DSA-65</h3>
        <p>NIST FIPS 204</p>
        <p className="pqc-winner-headline">ML-DSA is a standardized post-quantum signature family. Consider ML-DSA-65 for signing and verification; this advisor does not benchmark or select signatures.</p>
        <p className="pqc-signature-context">Your planning focus: {priorityLabels[priority]}; {footprintLabels[footprint]} footprint.</p>
      </section>
      <section className="pqc-clean-card" aria-labelledby="pqc-signature-comparison-title">
        <div className="pqc-clean-card-heading">
          <h3 id="pqc-signature-comparison-title">What to evaluate</h3>
          <p>Only key-agreement data is benchmarked. Signature performance, compatibility, and effort are not assessed.</p>
        </div>
        <div className="pqc-signature-metrics">
          <ComparisonMetric label="Security" detail="Confirm the NIST category with your security team" />
          <ComparisonMetric label="Performance" detail="Benchmark signing and verification" />
          <ComparisonMetric label="Compatibility" detail="Check certificate, firmware, client, and vendor support" />
          <ComparisonMetric label="Implementation effort" detail="Estimate signing and key-management work" />
        </div>
      </section>
      <WhatNext key="signature" onViewHosting={onViewHosting} />
    </div>
  );
}

function PqcComparePage({ organizationRole = 'IT' }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [picker, setPicker] = useState(DEFAULT_PICKER);
  const [assessment, setAssessment] = useState(null);
  const [signatureSelected, setSignatureSelected] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [assessing, setAssessing] = useState(false);
  const roleInfo = ROLE_GUIDANCE[organizationRole] || ROLE_GUIDANCE.IT;

  const goToSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updatePicker = (patch) => {
    setPicker(current => ({ ...current, ...patch }));
    setAssessment(null);
    setSignatureSelected(false);
    setAssessmentError('');
  };

  const submitAssessment = async (event) => {
    event.preventDefault();
    if (picker.task === 'signature') {
      setSignatureSelected(true);
      setAssessment(null);
      setAssessmentError('');
      return;
    }

    const priorityValues = {
      security: { security: 3, speed: 1, size: 1, resources: 1 },
      performance: { security: 2, speed: 3, size: 1, resources: 1 },
      simplicity: { security: 2, speed: 2, size: 1, resources: 1 },
    }[picker.priority];
    const footprintPriority = { small: 3, medium: 2, large: 1 }[picker.footprint];
    const requirements = {
      organization_name: '',
      application_name: '',
      application_type: 'intranet_portal',
      min_security_category: 1,
      priorities: { ...priorityValues, size: footprintPriority, resources: footprintPriority },
      finalized_standards_only: true,
    };

    setAssessing(true);
    setAssessment(null);
    setSignatureSelected(false);
    setAssessmentError('');
    try {
      setAssessment(await pqcAdvisorApi.assess(requirements));
    } catch (error) {
      setAssessmentError(error.message);
    } finally {
      setAssessing(false);
    }
  };

  return (
    <div className="pqc-layout">
      <aside className="pqc-sidebar" aria-label="PQC migration walkthrough">
        <div className="pqc-sidebar-heading">
          <span className="pqc-sidebar-kicker">FIELD GUIDE</span>
          <strong>Migration walkthrough</strong>
        </div>
        <nav className="pqc-section-nav">
          {SECTIONS.map(section => (
            <button
              type="button"
              key={section.id}
              className={`pqc-section-link${activeSection === section.id ? ' is-active' : ''}`}
              aria-current={activeSection === section.id ? 'location' : undefined}
              onClick={() => goToSection(section.id)}
            >
              <span>{section.index}</span>{section.label}
            </button>
          ))}
        </nav>
        <div className="pqc-sidebar-note">
          <span className="pqc-live-dot" />
          <p>Standards referenced: NIST FIPS 203 and 204</p>
        </div>
      </aside>

      <div className="pqc-content">
        <section className="pqc-intro" id="overview">
          <div className="pqc-eyebrow">CRYPTOGRAPHY TRANSITION / 2026</div>
          <h1>Plan the move to post-quantum cryptography.</h1>
          <p>Learn the basics, compare algorithms, and plan your organization’s next steps.</p>
        </section>

        <section className="pqc-section" id="advisor">
          <div className="pqc-section-heading">
            <div><span className="pqc-eyebrow">01 / ADVISOR</span><h2>Find a suitable starting point</h2></div>
            <p>Answer three questions to get started.</p>
          </div>
          <form className="pqc-advisor-form" onSubmit={submitAssessment}>
            <div className="pqc-picker-step">
              <span className="pqc-step-number">01</span>
              <label htmlFor="pqc-task">
                <span>What are you trying to do?</span>
                <select id="pqc-task" value={picker.task} onChange={event => updatePicker({ task: event.target.value, priority: '', footprint: '' })} required>
                  <option value="">Choose a task</option>
                  <option value="key-agreement">Agree on a shared secret (key agreement)</option>
                  <option value="signature">Sign or verify data (digital signature)</option>
                </select>
              </label>
            </div>
            {picker.task && (
              <div className="pqc-picker-step">
                <span className="pqc-step-number">02</span>
                <label htmlFor="pqc-priority">
                  <span>What matters most?</span>
                  <select id="pqc-priority" value={picker.priority} onChange={event => updatePicker({ priority: event.target.value, footprint: '' })} required>
                    <option value="">Choose a priority</option>
                    <option value="security">Security</option>
                    <option value="performance">Performance</option>
                    <option value="simplicity">Simplicity</option>
                  </select>
                </label>
              </div>
            )}
            {picker.priority && (
              <div className="pqc-picker-step">
                <span className="pqc-step-number">03</span>
                <label htmlFor="pqc-footprint">
                  <span>How large is your input or footprint?</span>
                  <select id="pqc-footprint" value={picker.footprint} onChange={event => updatePicker({ footprint: event.target.value })} required>
                    <option value="">Choose a size</option>
                    <option value="small">Small — tight bandwidth or memory</option>
                    <option value="medium">Medium — typical application</option>
                    <option value="large">Large — fewer size constraints</option>
                  </select>
                </label>
              </div>
            )}
            {picker.task && picker.priority && picker.footprint && (
              <>
                <p className="pqc-picker-note">
                  {picker.task === 'key-agreement'
                    ? `Based on stored benchmark data. ${picker.priority === 'simplicity' ? 'Simplicity is not measured; this uses a balanced profile. ' : ''}Check compatibility and effort in your environment.`
                      : 'Signatures are not benchmarked. Review this learning starting point with your team.'}
                </p>
                <button className="pqc-submit" type="submit" disabled={assessing}>
                  {assessing ? 'Comparing measured results…' : 'Show recommendation'}
                </button>
              </>
            )}
          </form>
          {assessmentError && <div className="pqc-advisor-error" role="alert"><strong>Could not create a recommendation.</strong><span>{assessmentError}</span></div>}
          {assessing && <p className="pqc-assessing" role="status">Scoring benchmark results…</p>}
          {assessment && <RecommendationPanel assessment={assessment} onViewHosting={() => goToSection('hosting')} />}
          {signatureSelected && <SignatureGuidance priority={picker.priority} footprint={picker.footprint} onViewHosting={() => goToSection('hosting')} />}
        </section>

        <section className="pqc-section" id="algorithms">
          <div className="pqc-section-heading">
            <div><span className="pqc-eyebrow">02 / LEARN</span><h2>What changes, and what does not</h2></div>
            <p>Key establishment protects conversations; signatures verify who approved data.</p>
          </div>
          <div className="pqc-plain-guide" aria-label="Plain-language cryptography guide">
            <article><span>01 / AGREE</span><strong>Key establishment</strong><p>Systems create a shared secret to encrypt conversations.</p></article>
            <article><span>02 / PROVE</span><strong>Digital signature</strong><p>Verify who signed data and whether it changed.</p></article>
            <article><span>03 / TRANSITION</span><strong>Hybrid rollout</strong><p>Combine classical and post-quantum methods during upgrades.</p></article>
          </div>
          <div className="pqc-comparison-list">
            {COMPARISONS.map(pair => (
              <div className="pqc-pair" key={pair.category}>
                <div className="pqc-pair-label"><span>{pair.category}</span><span>Current <b>→</b> Post-quantum</span></div>
                <div className="pqc-pair-grid">
                  <AlgorithmPanel data={pair.current} variant="current" />
                  <div className="pqc-transition-mark" aria-hidden="true">→</div>
                  <AlgorithmPanel data={pair.next} variant="modern" />
                </div>
              </div>
            ))}
          </div>
          <p className="pqc-caveat"><strong>Why plan early?</strong> Attackers can store encrypted data for future decryption. Prioritize long-lived secrets. These are starting points, not drop-in replacements; confirm protocol and vendor support before deployment.</p>
        </section>

        <section className="pqc-section" id="organization">
          <div className="pqc-section-heading">
            <div><span className="pqc-eyebrow">03 / ORGANIZE</span><h2>Recommended for your area</h2></div>
            <span className="pqc-role-chip">Viewing as {organizationRole}</span>
          </div>
          <div className="pqc-role-panel">
            <div className="pqc-role-heading"><span className="pqc-role-monogram">{organizationRole.slice(0, 2).toUpperCase()}</span><div><span>YOUR TEAM'S FIRST MOVES</span><h3>{roleInfo.title}</h3></div></div>
            <ol>{roleInfo.actions.map((action, index) => <li key={action}><span>0{index + 1}</span><p>{action}</p></li>)}</ol>
          </div>
          <div className="pqc-team-strip" aria-label="Teams involved in a PQC transition">
            {['IT', 'Developer', 'Planning', 'HR'].map(team => (
              <div key={team} className={organizationRole === team ? 'is-current' : ''}><span>{team === 'IT' ? '01' : team === 'Developer' ? '02' : team === 'Planning' ? '03' : '04'}</span><strong>{team}</strong></div>
            ))}
          </div>
        </section>

        <section className="pqc-section" id="hosting">
          <div className="pqc-section-heading">
            <div><span className="pqc-eyebrow">04 / DEPLOY</span><h2>Host the tool on your intranet</h2></div>
            <p>Give staff access without exposing internal infrastructure publicly.</p>
          </div>
          <div className="pqc-hosting-flow">
            <div className="pqc-hosting-origin"><span>INTERNAL ACCESS</span><strong>Staff browser</strong><small>Company network or managed VPN</small></div>
            <div className="pqc-hosting-connector" aria-hidden="true" />
            <div className="pqc-hosting-origin pqc-hosting-server"><span>INTRANET SERVICE</span><strong>Internal web host</strong><small>Private DNS · TLS · monitored updates</small></div>
            <div className="pqc-hosting-connector" aria-hidden="true" />
            <div className="pqc-hosting-origin"><span>IDENTITY</span><strong>Company SSO</strong><small>HR · IT · Developer · Planning groups</small></div>
          </div>
          <div className="pqc-ownership-grid">
            <article><span>IT / SECURITY</span><h3>Operate</h3><p>Own hosting, TLS, SSO integration, access logs, patching, backups, and incident response.</p></article>
            <article><span>DEVELOPMENT</span><h3>Maintain</h3><p>Build and test releases, track library updates, review dependencies, and keep the tool free of secrets.</p></article>
            <article><span>HR / PLANNING</span><h3>Coordinate</h3><p>Publish staff guidance, identify business owners, set priorities, and track training and procurement readiness.</p></article>
          </div>
          <div className="pqc-security-note"><strong>Access-control boundary</strong><p>Role selection is not authentication. For internal use, connect company SSO and enforce permissions on the server or identity-aware proxy.</p></div>
        </section>

        <footer className="pqc-footer"><span>Quantum readiness is a program, not a single algorithm swap.</span><button type="button" onClick={() => goToSection('overview')}>Back to overview ↑</button></footer>
      </div>
    </div>
  );
}

export default PqcComparePage;