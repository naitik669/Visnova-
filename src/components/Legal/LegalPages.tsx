import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const supportEmail = 'support@visnova.app';

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
        <p>VisNova stores account profile details, visions, tasks, notes, journal entries, audio note metadata, posts, comments, follows, messages, Growth resources, NovaCapsules, and app activity needed to run the product.</p>
        <p>Notes, journals, audio notes, private visions, private NovaCapsules, and Growth resources are private by default. Public posts, public profiles, public communities, and intentionally shared/public notes may be visible to other users.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">How Data Is Used</h2>
        <p>We use your data to authenticate your account, sync your workspace, show your social activity, protect the app from abuse, and provide support. We do not sell private workspace content.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Private Media</h2>
        <p>Audio notes and NovaCapsule media are stored in private Supabase buckets and loaded through signed URLs. Avatars and post images are treated as public media because they are displayed in social areas.</p>
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
    </LegalShell>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalShell title="Cookie Policy">
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Current Cookie Use</h2>
        <p>VisNova currently uses essential browser storage for authentication sessions, preferences, local UI state, and rate-limit friction. These are needed for the app to work.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-main">Analytics Cookies</h2>
        <p>No analytics provider is configured in the repository right now. If analytics cookies are added later, VisNova should show a cookie notice and update this page before launch.</p>
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
