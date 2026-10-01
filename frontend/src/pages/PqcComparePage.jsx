import React, { useState } from 'react';

const SECTIONS = [
  { id: 'overview', label: 'Overview', index: '01' },
  { id: 'algorithms', label: 'Algorithm comparison', index: '02' },
  { id: 'organization', label: 'Who should act', index: '03' },
  { id: 'hosting', label: 'Intranet hosting', index: '04' },
];

const COMPARISONS = [
  {
    category: 'Key establishment',
    current: {
      name: 'ECDH P-256 key agreement',
      explanation: 'Elliptic Curve Diffie-Hellman is widely used to agree on a secret over a network. P-256 names the curve parameters.',
      input: 'Each side combines its private key with the other side’s public key.',
      output: 'Both sides derive the same shared secret; the secret itself is never sent.',
      strength: 'Fast, compact, and widely supported. Ephemeral ECDH can also provide forward secrecy for past sessions if a long-term key is later exposed.',
      drawback: 'A sufficiently capable quantum computer could recover the private keys from recorded public-key exchanges, putting recorded sessions at risk.',
    },
    next: {
      name: 'ML-KEM-768 with a hybrid rollout',
      explanation: 'A standardized way to establish a shared secret using public and private keys, designed for the quantum era.',
      standard: 'NIST FIPS 203',
      input: 'Recipient public key and fresh encapsulation randomness',
      output: 'A shared secret plus a ciphertext sent to the recipient',
      drawback: 'Larger messages, library and protocol compatibility work, and careful key lifecycle testing are required.',
      benefit: 'Designed to resist known quantum attacks. A hybrid deployment can retain a classical key exchange during a staged transition.',
    },
  },
  {
    category: 'Digital signatures',
    current: {
      name: 'ECDSA P-256',
      explanation: 'Elliptic Curve Digital Signature Algorithm: a common way to sign and verify software, certificates, and messages.',
      input: 'Private signing key and a message digest',
      output: 'A compact signature verified with the public key',
      strength: 'Compact signatures and broad support in certificates, devices, and software-signing workflows.',
      drawback: 'A sufficiently capable quantum computer could derive the signing key, undermining trust in signed software, certificates, and updates.',
    },
    next: {
      name: 'ML-DSA-65',
      explanation: 'A standardized post-quantum digital signature algorithm for checking who signed data and whether it changed.',
      standard: 'NIST FIPS 204',
      input: 'Private signing key and a message',
      output: 'A post-quantum signature verified with the public key',
      drawback: 'Signatures and keys are larger; certificate chains, firmware limits, and vendor support need testing.',
      benefit: 'Designed to remain secure against known quantum attacks and suited to software signing, certificates, and document integrity workflows.',
    },
  },
];

const ROLE_GUIDANCE = {
  HR: {
    title: 'People, identity, and communication',
    actions: ['Coordinate staff notices and training for new signing and certificate workflows.', 'Work with IT on employee identity records, joiner and leaver processes, and support guidance.', 'Avoid collecting cryptographic secrets or personal data in the comparison tool.'],
  },
  IT: {
    title: 'Infrastructure and security operations',
    actions: ['Inventory TLS endpoints, VPNs, certificates, appliances, backups, and key-management services.', 'Prioritize data that must remain confidential for many years and systems exposed to untrusted networks.', 'Pilot hybrid key establishment with supported vendors; monitor latency, message size, and interoperability.'],
  },
  Developer: {
    title: 'Applications and product engineering',
    actions: ['Find direct cryptography calls and replace hard-coded algorithms with supported provider interfaces.', 'Test protocol negotiation, certificate sizes, signing pipelines, mobile clients, and rollback paths.', 'Use maintained cryptographic libraries; do not implement algorithms in application code.'],
  },
  Planning: {
    title: 'Portfolio, risk, and procurement',
    actions: ['Assign system owners and record vendor readiness, dependencies, and contract renewal dates.', 'Rank migrations by data shelf-life, exposure, business impact, and replacement lead time.', 'Fund discovery and pilots first, then sequence upgrades with measurable exit criteria.'],
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

function PqcComparePage({ organizationRole = 'IT' }) {
  const [activeSection, setActiveSection] = useState('overview');
  const roleInfo = ROLE_GUIDANCE[organizationRole] || ROLE_GUIDANCE.IT;

  const goToSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          <p>Compare familiar public-key algorithms with standardized post-quantum options, then turn the differences into a practical organization plan.</p>
          <div className="pqc-intro-meta">
            <span>KEY ESTABLISHMENT</span><i /> <span>DIGITAL SIGNATURES</span><i /> <span>INTRANET READINESS</span>
          </div>
        </section>

        <section className="pqc-section" id="algorithms">
          <div className="pqc-section-heading">
            <div><span className="pqc-eyebrow">01 / COMPARE</span><h2>What changes, and what does not</h2></div>
            <p>Two different jobs: agree on a secret to protect a conversation, or sign data to show who approved it.</p>
          </div>
          <div className="pqc-plain-guide" aria-label="Plain-language cryptography guide">
            <article><span>01 / AGREE</span><strong>Key establishment</strong><p>Two systems create the same secret so they can encrypt a conversation.</p></article>
            <article><span>02 / PROVE</span><strong>Digital signature</strong><p>A tamper-evident seal that helps verify who signed something.</p></article>
            <article><span>03 / TRANSITION</span><strong>Hybrid rollout</strong><p>Use classical and post-quantum methods together while systems are upgraded.</p></article>
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
          <p className="pqc-caveat"><strong>Why plan early?</strong> Attackers may save encrypted data now and try to decrypt it later. This matters most for information that must stay secret for many years. These are migration starting points, not drop-in replacements; confirm protocol support and vendor guidance before changing production systems.</p>
        </section>

        <section className="pqc-section" id="organization">
          <div className="pqc-section-heading">
            <div><span className="pqc-eyebrow">02 / ORGANIZE</span><h2>Recommended for your area</h2></div>
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
            <div><span className="pqc-eyebrow">03 / DEPLOY</span><h2>Host the tool on your intranet</h2></div>
            <p>Keep the comparison available to staff without exposing internal infrastructure to the public internet.</p>
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
          <div className="pqc-security-note"><strong>Access-control boundary</strong><p>This prototype lets a user choose a role to tailor guidance. That choice is not authentication or authorization. For an internal deployment, connect company SSO and enforce group permissions on the server or identity-aware proxy.</p></div>
        </section>

        <footer className="pqc-footer"><span>Quantum readiness is a program, not a single algorithm swap.</span><button type="button" onClick={() => goToSection('overview')}>Back to overview ↑</button></footer>
      </div>
    </div>
  );
}

export default PqcComparePage;