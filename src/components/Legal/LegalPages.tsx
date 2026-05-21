import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const supportEmail = 'naitik.business69@gmail.com';

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent">VisNova</p>
        <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight">{title}</h1>
        <p className="text-sm font-semibold text-text-secondary">Last updated: May 9, 2026</p>
      </div>
      <div className="prose prose-sm max-w-none text-text-secondary">
        {children}
      </div>
      <div className="rounded-2xl border border-card-border bg-card p-5 text-sm text-text-secondary">
        Questions or requests? Contact <a className="text-accent font-bold" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">What VisNova Collects</h2>
        <p>VisNova stores account profile details, visions, tasks, progress logs, notes, journal entries, audio note metadata, posts, comments, follows, messages, Growth resources, NovaCapsules, and app activity needed to run the product.</p>
        <p>VisNova is private by default. Private logs, private notes, private journals, private visions, private boards, private money/resource entries, private NovaCapsules, and private messages are visible only to you unless you intentionally choose Circle or Public sharing where supported.</p>
        <p>Circle sharing means people you choose. Public sharing means the item may appear on your profile, Feed, or public areas of VisNova.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">How Data Is Used</h2>
        <p>We use your data to authenticate your account, sync your workspace, show your chosen social activity, protect the app from abuse, and provide support. We do not sell private workspace content.</p>
        <p>Private messages are not used for recommendations. Private notes, private journals, private progress logs, and private message content are not used for optional analytics or recommendations.</p>
        <p>Resource recommendations may use selected interests, Vision categories, saved resources, money/resource goals, and product interactions when enabled. They do not use private message, journal, note, or private progress log content.</p>
        <p>VisNova uses account access controls, database security rules, and privacy settings to protect private content. We do not claim end-to-end encryption.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Private Media</h2>
        <p>Audio notes, journal media, NovaCapsule media, and private proof files should be stored in private Supabase buckets and loaded through signed URLs. Avatars and public post images are treated as public media because they are displayed in social areas.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Data Deletion</h2>
        <p>You can request account or data deletion by emailing {supportEmail} from your account email. Include “Data deletion request” in the subject. We will verify ownership before removing data.</p>
      </section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Eligibility</h2>
        <p>VisNova is intended for users who can legally create an online account in their region. If you are under the age required by your local law, use VisNova only with permission from a parent or guardian.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">User Content Rules</h2>
        <p>You are responsible for content you create or share. Do not post illegal content, harassment, hate, threats, explicit abuse, spam, malware, impersonation, or private information about others without permission.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Content Removal And Reporting</h2>
        <p>We may remove content that breaks these rules or creates safety, legal, or platform risk. Report content through the in-app report options or email {supportEmail} with a link and reason.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">YouTube Embeds</h2>
        <p>Growth Learning Sessions can embed YouTube videos. YouTube content remains governed by YouTube’s terms and privacy policies. Do not use VisNova to copy, redistribute, or claim ownership of third-party videos.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Partner Resource Links</h2>
        <p>Some resource links may be affiliate or partner links. If you purchase through them, VisNova may earn a commission at no extra cost to you.</p>
        <p>Products and templates are sold and fulfilled by third-party partners unless clearly stated otherwise. Prices, availability, delivery, refunds, and support are controlled by the partner site.</p>
      </section>
    </LegalShell>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalShell title="Cookie Policy for VisNova">
      <section className="space-y-4">
        <p>This Cookie Policy explains how VisNova uses cookies, local storage, session storage, and similar technologies when you use our website or app.</p>
        <p>VisNova is a personal growth and productivity platform where users can create visions, track progress, write notes and journals, manage wallet/resource goals, interact with other users, and receive optional personalized recommendations.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">1. What are cookies?</h2>
        <p>Cookies are small text files stored on your device when you visit a website. Similar technologies, such as local storage and session storage, may also be used to remember preferences, keep you signed in, improve security, and understand how the app is used.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">2. Types of cookies and storage we use</h2>
        <h3 className="text-base font-black text-text-main">A. Essential cookies and storage</h3>
        <p>These are required for VisNova to work properly.</p>
        <p>We may use essential cookies or storage to keep you signed in, maintain your session, protect your account, support authentication, remember security settings, prevent repeated login issues, support app navigation, and save temporary app state.</p>
        <p>Without these, VisNova may not work correctly.</p>

        <h3 className="text-base font-black text-text-main">B. Preference cookies and storage</h3>
        <p>These help VisNova remember your choices, including theme preference, layout preference, sidebar preference, notification settings, privacy settings, and recommendation settings.</p>

        <h3 className="text-base font-black text-text-main">C. Analytics cookies and similar technologies</h3>
        <p>With your permission, we may use analytics tools to understand how people use VisNova.</p>
        <p>Analytics may help us learn which features are used most, where users face errors, which pages load slowly, which flows need improvement, and how beta users interact with the app.</p>
        <p>Analytics should not include private messages, private journals, private notes, private progress logs, private wallet/resource entries, private goals, or private files.</p>

        <h3 className="text-base font-black text-text-main">D. Recommendation-related storage</h3>
        <p>VisNova may provide resource or product recommendations based on user-controlled settings.</p>
        <p>If enabled, recommendations may use signals such as selected interests, public or Circle vision categories, task tags, saved resources, wallet/resource goals, store activity, and product interactions.</p>
        <p className="font-bold text-text-main">Private messages, private journals, private notes, and private progress logs are never used for recommendations.</p>

        <h3 className="text-base font-black text-text-main">E. Third-party cookies and services</h3>
        <p>VisNova may use third-party services to operate the app, such as authentication providers, hosting providers, database/storage providers, analytics providers, payment providers, and store or affiliate partners in the future.</p>
        <p>These services may use their own cookies or similar technologies according to their own policies.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">3. Why we use cookies and similar technologies</h2>
        <p>We use cookies and similar technologies to keep VisNova secure, keep users logged in, remember user preferences, improve app performance, find and fix bugs, understand feature usage, personalize the app experience if allowed, and support optional resource/product recommendations if allowed.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">4. What we do not use cookies for</h2>
        <p>VisNova does not use private messages for product/resource recommendations.</p>
        <p>We do not use private journals, private notes, private progress logs, or private wallet/resource entries for optional analytics or recommendations.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">5. User choices</h2>
        <p>Users can control cookies and tracking through VisNova’s Cookie Settings or Privacy Settings where available, browser settings, clearing cookies/local storage from their browser, and disabling optional analytics or recommendation personalization.</p>
        <p>Disabling essential cookies or storage may cause parts of VisNova to stop working properly.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">6. Cookie consent</h2>
        <p>Where required, VisNova asks for consent before using optional analytics, marketing, or recommendation-related cookies.</p>
        <p>Essential cookies required for login, security, and core app functionality may be used without separate consent.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">7. Changes to this Cookie Policy</h2>
        <p>We may update this Cookie Policy as VisNova evolves. If we make important changes, we may notify users through the app or update the “Last updated” date.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">8. Contact</h2>
        <p>For privacy or cookie-related questions, contact us at <a className="text-accent font-bold" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </section>
    </LegalShell>
  );
}

export function SupportPage() {
  return (
    <LegalShell title="Support">
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Contact</h2>
        <p>For support, legal requests, account deletion, privacy questions, or content removal requests, email <a className="text-accent font-bold" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
        <p>For bug reports, use the <Link className="text-accent font-bold" to="/feedback">Feedback page</Link>.</p>
      </section>
    </LegalShell>
  );
}
