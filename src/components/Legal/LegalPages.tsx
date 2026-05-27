import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cookie, FileText, LifeBuoy, Mail, Scale, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { cn } from '../../lib/utils';

const supportEmail = 'naitik.business69@gmail.com';
const lastUpdated = 'May 26, 2026';

type TocItem = { id: string; label: string };

function slugify(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function LegalUpdatedBadge() {
  return (
    <span className="inline-flex min-h-9 items-center rounded-full border border-accent/15 bg-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent">
      Last updated {lastUpdated}
    </span>
  );
}

function LegalCallout({
  title,
  children,
  tone = 'accent'
}: {
  title?: string;
  children: ReactNode;
  tone?: 'accent' | 'warning' | 'danger';
}) {
  const toneClass = {
    accent: 'border-accent/15 bg-accent/5 text-text-secondary',
    warning: 'border-warning/20 bg-warning/10 text-text-secondary',
    danger: 'border-danger/20 bg-danger/10 text-danger'
  }[tone];
  return (
    <div className={cn('rounded-[1.5rem] border p-4 text-sm font-semibold leading-7 sm:rounded-3xl sm:p-5', toneClass)}>
      {title && <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-text-main">{title}</p>}
      {children}
    </div>
  );
}

function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4 border-b border-card-border/60 pb-7 last:border-b-0 sm:scroll-mt-24 sm:pb-8">
      <h2 className="text-lg font-black tracking-tight text-text-main sm:text-2xl">{title}</h2>
      <div className="space-y-4 text-sm font-semibold leading-7 text-text-secondary sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function LegalTableOfContents({ items }: { items: TocItem[] }) {
  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-[1.5rem] border border-card-border bg-card/90 p-4 shadow-xl shadow-accent/5 sm:rounded-[1.75rem] sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Contents</p>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {items.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex h-10 shrink-0 items-center rounded-2xl border border-card-border bg-app-container px-3 text-xs font-bold text-text-secondary transition hover:bg-accent/10 hover:text-accent lg:block lg:h-auto lg:border-0 lg:bg-transparent lg:py-2"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function LegalContactCard() {
  return (
    <div className="rounded-[1.75rem] border border-card-border bg-card p-4 shadow-xl shadow-accent/5 sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Questions or requests</p>
          <h3 className="mt-2 text-xl font-black text-text-main">Contact VisNova support</h3>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-secondary">
            For privacy requests, account help, content reports, or legal questions, email us from your account email when possible.
          </p>
        </div>
        <a
          href={`mailto:${supportEmail}`}
          className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-sm shadow-accent/20 sm:w-auto"
        >
          <Mail size={16} />
          Email support
        </a>
      </div>
    </div>
  );
}

function RelatedLegalLinks() {
  const links = [
    { to: '/privacy-policy', label: 'Privacy Policy' },
    { to: '/terms-of-service', label: 'Terms' },
    { to: '/cookie-policy', label: 'Cookies' },
    { to: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
    { to: '/data-rights', label: 'Data Rights' },
    { to: '/community-guidelines', label: 'Guidelines' },
    { to: '/contact', label: 'Contact' }
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {links.map(link => (
        <Link
          key={link.to}
          to={link.to}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border bg-card px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-text-secondary hover:border-accent/30 hover:text-accent sm:justify-start"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function LegalShell({
  eyebrow,
  title,
  summary,
  icon,
  sections,
  children
}: {
  eyebrow: string;
  title: string;
  summary: string;
  icon: ReactNode;
  sections: TocItem[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-20">
      <header className="overflow-hidden rounded-[1.75rem] border border-card-border bg-card p-5 shadow-2xl shadow-accent/5 sm:rounded-[2.25rem] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Link to="/" className="inline-flex items-center gap-3 text-text-main">
              <BrandLogo className="h-6 w-6" />
              <span className="text-sm font-black uppercase tracking-[0.28em]">VisNova</span>
            </Link>
            <div className="mt-7 flex items-center gap-3 text-accent sm:mt-8">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10">{icon}</div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em]">{eyebrow}</p>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-text-main sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-text-secondary sm:text-base sm:leading-8">{summary}</p>
          </div>
          <div className="space-y-3">
            <LegalUpdatedBadge />
            <p className="max-w-sm text-xs font-semibold leading-6 text-text-secondary/70">
              These pages are beta-ready product policies. Final legal review by a qualified professional is recommended before a full public launch.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <LegalTableOfContents items={sections} />
        <main className="space-y-8">
          <div className="rounded-[1.75rem] border border-card-border bg-card p-4 shadow-xl shadow-accent/5 sm:rounded-[2rem] sm:p-8">
            <div className="space-y-7 sm:space-y-8">{children}</div>
          </div>
          <LegalContactCard />
          <div className="rounded-[1.75rem] border border-card-border bg-surface-muted/70 p-4 sm:rounded-[2rem] sm:p-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary/60">Related trust pages</p>
            <RelatedLegalLinks />
            <p className="mt-4 text-xs font-semibold text-text-secondary/60">Last updated {lastUpdated}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

const privacySections = [
  'Introduction',
  'Information We Collect',
  'Private by Default',
  'Visibility Controls',
  'How We Use Information',
  'What We Do Not Use',
  'Resource Recommendations',
  'Cookies and Analytics',
  'Sharing and Public Content',
  'Vision Teams',
  'Storage and Security',
  'Third-Party Services',
  'Data Retention',
  'Your Rights and Choices',
  'Children and Teen Users',
  'Changes and Contact'
].map(label => ({ id: slugify(label), label }));

export function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Trust Center"
      title="Privacy Policy"
      summary="How VisNova collects, uses, protects, and shares information while keeping private productivity work separate from social sharing."
      icon={<ShieldCheck size={22} />}
      sections={privacySections}
    >
      <LegalCallout title="Short version">
        Private logs are yours only. Only you can see private progress logs unless you choose to share them with your Circle or make them public.
      </LegalCallout>

      <LegalSection id="introduction" title="1. Introduction">
        <p>VisNova is a personal growth, productivity, progress tracking, and social accountability app. This policy explains how we handle information connected to your account, workspace, social features, recommendations, and support requests.</p>
        <p>When we say “VisNova,” “we,” or “us,” we mean the VisNova app and team operating the service during beta.</p>
      </LegalSection>

      <LegalSection id="information-we-collect" title="2. Information We Collect">
        <p>We collect account information such as your email, authentication details, profile name, username, avatar, role, interests, and onboarding responses.</p>
        <p>We store content you create in VisNova, including Visions, tasks, progress logs, notes, journals, Vision Boards, resources, money goals, Feed posts, comments, Circle/accountability interactions, messages if enabled, Nova Clock/NovaCapsule content, feedback, and bug reports.</p>
        <p>We may collect device and browser information, app preferences, cookie choices, analytics events when allowed, and product/resource recommendation interactions.</p>
      </LegalSection>

      <LegalSection id="private-by-default" title="3. Private by Default">
        <p>Private logs are yours only. Only you can see private progress logs unless you choose to share them with your Circle or make them public.</p>
        <p>Private notes, journals, private Vision Boards, private messages, and private resources stay private unless a product feature clearly lets you share that specific item.</p>
        <p>Your default workspace content is not treated as public content just because it exists in VisNova.</p>
      </LegalSection>

      <LegalSection id="visibility-controls" title="4. Visibility Controls">
        <p><strong>Private</strong> means only you can access the item from your account.</p>
        <p><strong>Circle</strong> means people you choose through Circle or an allowed shared space can see it.</p>
        <p><strong>Public</strong> means the item may appear in public areas such as Feed, your public profile, or public previews.</p>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="5. How We Use Information">
        <p>We use information to provide the app, save and sync your content, authenticate your account, personalize your experience, show progress analytics, support Circle/accountability features, respond to feedback, improve performance, and protect VisNova from abuse.</p>
        <p>Resource recommendations may use allowed signals to suggest useful tools, templates, learning resources, or products connected to your goals.</p>
      </LegalSection>

      <LegalSection id="what-we-do-not-use" title="6. What We Do Not Use">
        <p>Private messages are not used for recommendations. Private journals are not used for recommendations. Private notes are not used for recommendations. Private logs are not used for recommendations or optional analytics.</p>
        <p>Private content is not sold to advertisers.</p>
      </LegalSection>

      <LegalSection id="resource-recommendations" title="7. Resource Recommendations / Store">
        <p>If enabled, recommendations may use selected interests, Vision categories, saved resources, resource goals, money goals, store activity, and product interactions.</p>
        <p>Private messages, journals, notes, and private progress logs are not used for recommendations. You can manage recommendation and cookie preferences in Settings where available.</p>
      </LegalSection>

      <LegalSection id="cookies-and-analytics" title="8. Cookies and Analytics">
        <p>VisNova uses essential cookies or local storage for authentication, session management, app security, theme, layout, and cookie preferences.</p>
        <p>Optional analytics and personalization are used only when enabled or consented to where required. See our <Link className="text-accent font-black" to="/cookie-policy">Cookie Policy</Link>.</p>
      </LegalSection>

      <LegalSection id="sharing-and-public-content" title="9. Sharing and Public Content">
        <p>Public posts, public profile content, public proof, and public Vision previews may be visible to other users. Circle content is visible to the selected audience. You are responsible for what you publish or share.</p>
      </LegalSection>

      <LegalSection id="vision-teams" title="10. Collaboration / Vision Teams">
        <p>Vision Teams are scoped collaboration spaces around one Vision or Vision Board. Collaborators can access only content shared inside that Vision Team.</p>
        <p>Your private notes, journals, logs, messages, resources, money goals, and other Visions remain private unless you intentionally share them through a supported feature.</p>
      </LegalSection>

      <LegalSection id="storage-and-security" title="11. Data Storage and Security">
        <p>We use account access controls, database security rules, storage permissions, and privacy settings to protect user content.</p>
        <p>We do not claim end-to-end encryption, “100% private,” “military-grade security,” or that VisNova staff can never access data for operations, safety, legal, or support needs.</p>
      </LegalSection>

      <LegalSection id="third-party-services" title="12. Third-Party Services">
        <p>VisNova may use Supabase for database, authentication, storage, and backend services; Vercel for hosting and deployment; Google OAuth if you choose Google login; analytics providers if enabled; email/support tools; and affiliate or partner sites for resource links.</p>
        <p>Third-party sites and partners have their own terms and privacy policies.</p>
      </LegalSection>

      <LegalSection id="data-retention" title="13. Data Retention">
        <p>We retain account and workspace data while your account exists or while needed to provide the service, resolve disputes, comply with legal requirements, prevent abuse, or maintain backups.</p>
        <p>Deleted data may take time to fully disappear from backups or logs, but we will not intentionally keep deleted user content as active product data longer than needed.</p>
      </LegalSection>

      <LegalSection id="your-rights-and-choices" title="14. Your Rights and Choices">
        <p>You may request access, correction, export, deletion, or account closure by contacting us. You can also manage visibility, cookie choices, recommendation preferences, and optional consent where available.</p>
        <p>See <Link className="text-accent font-black" to="/data-rights">Data Rights</Link> for request instructions.</p>
      </LegalSection>

      <LegalSection id="children-and-teen-users" title="15. Children and Teen Users">
        <p>VisNova may appeal to students and young builders, but users must meet the minimum age rules in their location. If you are under the legal age to use online services independently, use VisNova only with parent or guardian consent where required.</p>
        <p>We do not knowingly target advertising to children, and private user content is not used for recommendations.</p>
      </LegalSection>

      <LegalSection id="changes-and-contact" title="16. Changes and Contact">
        <p>We may update this policy as VisNova changes. We will update the “Last updated” date and may notify users of important changes through the app.</p>
        <p>Contact us at <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}

const termsSections = [
  'Agreement to Terms',
  'What VisNova Provides',
  'Beta Disclaimer',
  'Account Responsibilities',
  'User Content',
  'Visibility and Sharing',
  'Acceptable Use',
  'Community Rules',
  'Vision Teams',
  'Affiliate Links',
  'No Professional Advice',
  'Payments',
  'Termination',
  'Disclaimers',
  'Limitation of Liability',
  'Changes and Contact'
].map(label => ({ id: slugify(label), label }));

export function TermsPage() {
  return (
    <LegalShell
      eyebrow="Product Rules"
      title="Terms of Service"
      summary="The rules for using VisNova, sharing content, collaborating, and participating in Feed, Circle, and beta features."
      icon={<Scale size={22} />}
      sections={termsSections}
    >
      <LegalSection id="agreement-to-terms" title="1. Agreement to Terms">
        <p>By using VisNova, you agree to these Terms. If you do not agree, do not use the app.</p>
      </LegalSection>
      <LegalSection id="what-visnova-provides" title="2. What VisNova Provides">
        <p>VisNova provides productivity and progress tracking tools, including Visions, tasks, progress logs, notes, journals, Vision Boards, Feed, Circle, messages where enabled, recommendations, analytics, Nova Clock, and beta collaboration features.</p>
      </LegalSection>
      <LegalSection id="beta-disclaimer" title="3. Beta Disclaimer">
        <p>VisNova may currently be in beta. Features may change, break, be removed, or become unavailable while we improve the product.</p>
      </LegalSection>
      <LegalSection id="account-responsibilities" title="4. Account Responsibilities">
        <p>You are responsible for accurate account information, protecting your login credentials, and activity under your account.</p>
      </LegalSection>
      <LegalSection id="user-content" title="5. User Content">
        <p>You own your content. You give VisNova a limited license to store, process, display, and transmit your content only as needed to operate the app, sync your data, show content to audiences you choose, provide support, and improve safety.</p>
      </LegalSection>
      <LegalSection id="visibility-and-sharing" title="6. Visibility and Sharing">
        <p>Private, Circle, and Public visibility settings control who can see supported content. You are responsible for public posts and for not sharing another person’s private content without permission.</p>
      </LegalSection>
      <LegalSection id="acceptable-use" title="7. Acceptable Use">
        <p>Do not use VisNova for harassment, hate speech, sexual exploitation, illegal content, spam, malware, scraping, impersonation, doxxing, threats, violating others’ rights, unsafe product promotion, or attempts to bypass security.</p>
      </LegalSection>
      <LegalSection id="community-rules" title="8. Feed / Circle / Community Rules">
        <p>Use Feed, Circle, comments, nudges, proof requests, and communities respectfully. Do not abuse nudges, shame users, spam promotional links, or publish private information without consent.</p>
      </LegalSection>
      <LegalSection id="vision-teams" title="9. Collaboration / Vision Teams">
        <p>Vision Team owners and admins control shared board access. Collaborators must respect team content and role permissions. Removing a member may revoke access. Viewers, editors, admins, and owners have different permissions.</p>
      </LegalSection>
      <LegalSection id="affiliate-links" title="10. Resource Recommendations / Affiliate Links">
        <p>Some resource links may be affiliate or partner links. VisNova may earn a commission at no extra cost to you. Products are sold, delivered, refunded, and supported by third parties unless clearly stated otherwise.</p>
      </LegalSection>
      <LegalSection id="no-professional-advice" title="11. No Professional Advice">
        <p>VisNova is not a financial advisor, medical advisor, legal advisor, mental health provider, or academic guarantee service. Use your judgment and consult qualified professionals when needed.</p>
      </LegalSection>
      <LegalSection id="payments" title="12. Payments / Subscriptions">
        <p>Paid plans may be introduced later. Any paid features will be clearly explained before purchase.</p>
      </LegalSection>
      <LegalSection id="termination" title="13. Termination">
        <p>We may suspend, restrict, or remove accounts or content that violate these Terms, create safety risk, abuse the platform, or create legal or operational risk.</p>
      </LegalSection>
      <LegalSection id="disclaimers" title="14. Disclaimers">
        <p>VisNova is provided “as is” and “as available.” We work to keep it reliable, but we cannot guarantee uninterrupted access, error-free features, or that every goal, recommendation, or workflow will work for your situation.</p>
      </LegalSection>
      <LegalSection id="limitation-of-liability" title="15. Limitation of Liability">
        <p>To the maximum extent allowed by law, VisNova and its team are not liable for indirect, incidental, consequential, special, or punitive damages, or for losses caused by third-party services, partner sites, user content, or unavailable beta features.</p>
      </LegalSection>
      <LegalSection id="changes-and-contact" title="16. Changes and Contact">
        <p>We may update these Terms as VisNova evolves. Contact <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a> with questions.</p>
      </LegalSection>
    </LegalShell>
  );
}

const cookieSections = [
  'What Cookies Are',
  'Essential Storage',
  'Analytics',
  'Preferences',
  'Managing Choices',
  'Third Parties',
  'Contact'
].map(label => ({ id: slugify(label), label }));

export function CookiePolicyPage() {
  return (
    <LegalShell
      eyebrow="Browser Storage"
      title="Cookie Policy"
      summary="How VisNova uses cookies, local storage, session storage, analytics choices, and recommendation preferences."
      icon={<Cookie size={22} />}
      sections={cookieSections}
    >
      <LegalSection id="what-cookies-are" title="1. What Cookies and Local Storage Are">
        <p>Cookies are small files stored by your browser. Local storage and session storage are similar browser technologies that help apps remember settings and keep sessions working.</p>
      </LegalSection>
      <LegalSection id="essential-storage" title="2. Essential Cookies / Storage">
        <p>VisNova uses essential storage for authentication, session continuity, security, app navigation, cookie consent, and core preferences needed for the app to work.</p>
      </LegalSection>
      <LegalSection id="analytics" title="3. Analytics Cookies">
        <p>With your permission where required, analytics may help us understand app usage, performance, crashes, and beta flows. Analytics should not include private messages, journals, notes, private progress logs, or private files.</p>
      </LegalSection>
      <LegalSection id="preferences" title="4. Preference Storage">
        <p>Preference storage may remember theme, layout, sidebar state, cookie choices, language if added, and recommendation settings.</p>
      </LegalSection>
      <LegalSection id="managing-choices" title="5. Managing Choices">
        <p>You can manage cookie choices from the cookie banner, Settings, or your browser controls. Blocking essential storage may break login or core app behavior.</p>
      </LegalSection>
      <LegalSection id="third-parties" title="6. Third-Party Cookies">
        <p>OAuth providers, analytics providers, embedded services, hosting tools, and affiliate/partner sites may use their own cookies under their own policies.</p>
      </LegalSection>
      <LegalSection id="contact" title="7. Contact">
        <p>Cookie questions can be sent to <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}

const affiliateSections = [
  'Disclosure',
  'How Recommendations Work',
  'Third-Party Partners',
  'No Guarantees',
  'Private Data',
  'Contact'
].map(label => ({ id: slugify(label), label }));

export function AffiliateDisclosurePage() {
  return (
    <LegalShell
      eyebrow="Resource Transparency"
      title="Affiliate / Resource Disclosure"
      summary="How VisNova handles partner links, resource recommendations, commissions, and third-party product responsibility."
      icon={<FileText size={22} />}
      sections={affiliateSections}
    >
      <LegalSection id="disclosure" title="1. Affiliate / Partner Link Disclosure">
        <p>Some links in VisNova may be affiliate or partner links. If you purchase through those links, VisNova may earn a commission at no extra cost to you.</p>
      </LegalSection>
      <LegalSection id="how-recommendations-work" title="2. How Recommendations Work">
        <p>Resources are recommended to support user goals, Visions, learning, building, productivity, or planning. Recommendations may use selected interests, Vision categories, saved resources, money/resource goals, store activity, and product interactions when allowed.</p>
      </LegalSection>
      <LegalSection id="third-party-partners" title="3. Third-Party Partners">
        <p>Third-party partners handle checkout, delivery, refunds, pricing, product quality, and customer support unless VisNova clearly says otherwise.</p>
        <LegalCallout title="Product preview language">
          This product is sold and fulfilled by a third-party partner. VisNova may earn a commission.
        </LegalCallout>
        <LegalCallout title="Digital resource language">
          This digital product is delivered by a third-party creator/platform. VisNova may earn a commission.
        </LegalCallout>
      </LegalSection>
      <LegalSection id="no-guarantees" title="4. No Guarantees">
        <p>Recommendations are not guarantees of results, quality, availability, pricing, refunds, or suitability. Prices and availability may change.</p>
      </LegalSection>
      <LegalSection id="private-data" title="5. Private Data Is Not Used">
        <p>Private messages, journals, notes, and private progress logs are not used for recommendations.</p>
      </LegalSection>
      <LegalSection id="contact" title="6. Contact">
        <p>Questions about resource disclosures can be sent to <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}

const communitySections = [
  'Core Values',
  'Rules',
  'Accountability Tone',
  'Safety and Reporting',
  'Consequences'
].map(label => ({ id: slugify(label), label }));

export function CommunityGuidelinesPage() {
  return (
    <LegalShell
      eyebrow="Community Standards"
      title="Community Guidelines"
      summary="How to participate in Feed, Circle, comments, nudges, help requests, and accountability features without harming trust."
      icon={<ShieldCheck size={22} />}
      sections={communitySections}
    >
      <LegalSection id="core-values" title="1. Core Values">
        <p>Build honestly. Respect privacy. Encourage progress. Help others. Share useful proof. Keep accountability supportive.</p>
      </LegalSection>
      <LegalSection id="rules" title="2. Rules">
        <p>Do not harass, bully, impersonate, spam, post illegal or unsafe content, share private content without permission, abuse nudges/proof requests, or post harmful or age-restricted product recommendations.</p>
      </LegalSection>
      <LegalSection id="accountability-tone" title="3. Accountability Tone">
        <p>Encourage, do not shame. Ask for updates respectfully. Offer help when someone is blocked. Do not turn Circle into a popularity contest.</p>
      </LegalSection>
      <LegalSection id="safety-and-reporting" title="4. Safety and Reporting">
        <p>Use in-app report tools where available or email <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a> with relevant details.</p>
      </LegalSection>
      <LegalSection id="consequences" title="5. Consequences">
        <p>We may remove content, limit features, suspend accounts, or take other action for violations or safety risks.</p>
      </LegalSection>
    </LegalShell>
  );
}

const dataSections = [
  'Available Requests',
  'How to Request',
  'Beta Status',
  'Verification',
  'Contact'
].map(label => ({ id: slugify(label), label }));

export function DataRightsPage() {
  return (
    <LegalShell
      eyebrow="Data Controls"
      title="Data Rights"
      summary="How to request access, export, correction, deletion, account closure, or optional consent changes during beta."
      icon={<ShieldCheck size={22} />}
      sections={dataSections}
    >
      <LegalSection id="available-requests" title="1. Available Requests">
        <p>You can request data access, data export, correction, account deletion, content deletion, or withdrawal of optional consent where available.</p>
      </LegalSection>
      <LegalSection id="how-to-request" title="2. How to Request">
        <p>Email <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a> from your account email with a clear subject such as “Data export request” or “Account deletion request.”</p>
      </LegalSection>
      <LegalSection id="beta-status" title="3. Beta Status">
        <LegalCallout title="Current beta process" tone="warning">
          Automated export and deletion tools are being improved. For now, contact us at {supportEmail} for data requests.
        </LegalCallout>
      </LegalSection>
      <LegalSection id="verification" title="4. Verification">
        <p>We may verify account ownership before acting on data requests. Some records may be retained temporarily where required for security, abuse prevention, legal compliance, or backups.</p>
      </LegalSection>
      <LegalSection id="contact" title="5. Contact">
        <p>For privacy and data rights requests, contact <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}

const contactSections = [
  'Contact Options',
  'Bug Reports',
  'Privacy and Data Requests',
  'Content Reports',
  'Response Time'
].map(label => ({ id: slugify(label), label }));

export function SupportPage() {
  return <ContactPage />;
}

export function ContactPage() {
  return (
    <LegalShell
      eyebrow="Support"
      title="Contact / Support"
      summary="How to reach VisNova for help, feedback, bug reports, privacy requests, and safety or content concerns."
      icon={<LifeBuoy size={22} />}
      sections={contactSections}
    >
      <LegalSection id="contact-options" title="1. Contact Options">
        <p>Email support: <a className="text-accent font-black" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
        <p>Use the same email for support, privacy, legal, and data rights during beta unless a separate address is announced.</p>
      </LegalSection>
      <LegalSection id="bug-reports" title="2. Bug Reports and Feedback">
        <p>Use the <Link className="text-accent font-black" to="/feedback">Feedback page</Link> to send feedback or a bug report. You can also email us directly.</p>
      </LegalSection>
      <LegalSection id="privacy-and-data-requests" title="3. Privacy and Data Requests">
        <p>For export, deletion, correction, or privacy questions, include your account email and a clear subject line.</p>
      </LegalSection>
      <LegalSection id="content-reports" title="4. Content Reports">
        <p>For content removal or safety concerns, include the link, username, screenshot if helpful, and reason for the report. Do not send private content unless needed for the report.</p>
      </LegalSection>
      <LegalSection id="response-time" title="5. Response Time">
        <p>During beta, response times may vary. We prioritize account access, privacy requests, safety reports, and major app bugs.</p>
      </LegalSection>
    </LegalShell>
  );
}

export function TrustIndexPage() {
  const cards = [
    { to: '/privacy-policy', title: 'Privacy Policy', desc: 'Data collection, privacy defaults, sharing, and security.', icon: ShieldCheck },
    { to: '/terms-of-service', title: 'Terms of Service', desc: 'Product rules, user content, beta terms, and acceptable use.', icon: Scale },
    { to: '/cookie-policy', title: 'Cookie Policy', desc: 'Cookies, local storage, analytics, and preferences.', icon: Cookie },
    { to: '/affiliate-disclosure', title: 'Affiliate Disclosure', desc: 'Partner links, commissions, and resource recommendations.', icon: FileText },
    { to: '/data-rights', title: 'Data Rights', desc: 'Export, deletion, correction, and account requests.', icon: ShieldCheck },
    { to: '/community-guidelines', title: 'Community Guidelines', desc: 'Rules for Feed, Circle, nudges, comments, and support.', icon: ShieldCheck },
    { to: '/contact', title: 'Contact / Support', desc: 'How to reach us for help, privacy, legal, or bugs.', icon: LifeBuoy }
  ];

  return (
    <div className="mx-auto max-w-7xl pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-20">
      <header className="rounded-[1.75rem] border border-card-border bg-card p-5 shadow-2xl shadow-accent/5 sm:rounded-[2.25rem] sm:p-8">
        <BrandLogo className="h-6 w-6" />
        <p className="mt-7 text-[10px] font-black uppercase tracking-[0.35em] text-accent sm:mt-8">VisNova Trust Center</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-text-main sm:text-5xl">Legal, privacy, and community trust.</h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-text-secondary sm:text-base sm:leading-8">
          Clear policies for a beta product built around private progress, intentional sharing, and respectful accountability.
        </p>
      </header>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.to} to={card.to} className="group flex min-h-36 gap-4 rounded-[1.75rem] border border-card-border bg-card p-4 shadow-xl shadow-accent/5 transition hover:-translate-y-0.5 hover:border-accent/30 sm:block sm:min-h-0 sm:rounded-[2rem] sm:p-6">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-text-main sm:mt-5 sm:text-xl">{card.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">{card.desc}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent sm:mt-5">
                  Open <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
