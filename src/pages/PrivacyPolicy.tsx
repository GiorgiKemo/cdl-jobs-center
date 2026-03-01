import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <div className="border-l-4 border-primary pl-3 mb-3">
      <h2 className="font-display font-semibold text-base text-foreground">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
      {children}
    </div>
  </div>
);

const PrivacyPolicy = () => {
  usePageTitle("Privacy Policy");
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto py-8 max-w-3xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Privacy Policy
        </p>

        <div className="border border-border bg-card">
          <div className="border-l-4 border-l-primary border-b border-b-border px-5 py-4">
            <h1 className="font-display font-bold text-xl">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: February 27, 2026</p>
          </div>

          <div className="px-5 py-8">

            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              CDL Jobs Center ("we," "us," or "our") operates the CDL Jobs Center website and platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. Please read this policy carefully. By using our platform, you agree to the collection and use of information in accordance with this policy.
            </p>

            <Section title="1. Information We Collect">
              <p>We collect information you provide directly to us when you create an account, submit an application, or contact us:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Personal identifiers: full name, username, email address, phone number, zip code</li>
                <li>CDL credentials: CDL number, license class (A, B, or C), issuing state, endorsements</li>
                <li>Driving history: years of experience, hauler types, route preferences, accident and violation history</li>
                <li>Employment preferences: driver type (company driver, owner operator, student), preferred pay, home time, benefits</li>
                <li>Account credentials: username and encrypted password</li>
              </ul>
              <p className="mt-2">We may also automatically collect certain technical data when you use our platform, including IP address, browser type, pages visited, and time spent on pages.</p>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>To match you with trucking companies and job opportunities that fit your profile and preferences</li>
                <li>To create and manage your account and application profile</li>
                <li>To transmit your application to carriers you select or that match your criteria</li>
                <li>To send job alerts, newsletters, and platform updates (only if you opt in)</li>
                <li>To improve and personalize our services and job matching algorithms</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
                <li>To detect and prevent fraudulent or unauthorized activity</li>
              </ul>
            </Section>

            <Section title="3. How We Share Your Information">
              <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong className="text-foreground">Trucking companies and carriers:</strong> When you submit an application or give consent to be matched, your profile information is shared with relevant carriers for recruitment purposes.</li>
                <li><strong className="text-foreground">Service providers:</strong> We may share data with trusted third-party vendors who help us operate our platform (hosting, email delivery, analytics), under strict confidentiality obligations.</li>
                <li><strong className="text-foreground">Legal requirements:</strong> We may disclose information if required by law, court order, or government authority.</li>
                <li><strong className="text-foreground">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              </ul>
              <p className="mt-2">We do not share your CDL number, SSN, or financial information with any third party without your explicit consent.</p>
            </Section>

            <Section title="4. Data Retention">
              <p>We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will remove your profile and application data within 30 days, except where retention is required by law. Anonymized, aggregated data may be retained indefinitely for analytics purposes.</p>
            </Section>

            <Section title="5. Data Security">
              <p>We implement industry-standard security measures to protect your personal information, including encrypted storage of passwords, HTTPS encryption for data in transit, and access controls limiting employee access to personal data. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security and encourage you to use a strong, unique password.</p>
            </Section>

            <Section title="6. Your Rights and Choices">
              <p>You have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong className="text-foreground">Access:</strong> Request a copy of the personal information we hold about you.</li>
                <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and personal data.</li>
                <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from marketing emails at any time using the unsubscribe link in any email.</li>
                <li><strong className="text-foreground">Portability:</strong> Request a portable copy of your data in a common format.</li>
              </ul>
              <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:info@cdljobscenter.com" className="text-primary hover:underline">info@cdljobscenter.com</a>.</p>
            </Section>

            <Section title="7. Cookies and Tracking">
              <p>We use essential cookies to maintain your session and preferences (such as dark mode). We do not use third-party advertising cookies. You can control cookie settings through your browser; however, disabling cookies may affect the functionality of our platform.</p>
            </Section>

            <Section title="8. Children's Privacy">
              <p>Our platform is not directed to individuals under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us and we will promptly delete it.</p>
            </Section>

            <Section title="9. Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email and post the updated policy on this page with a revised "last updated" date. Your continued use of the platform after any changes constitutes your acceptance of the new policy.</p>
            </Section>

            <Section title="10. Contact Us">
              <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
              <div className="mt-3 p-4 border border-border bg-muted/30 space-y-1">
                <p><strong className="text-foreground">CDL Jobs Center</strong></p>
                <p>1975 E Sunrise Blvd, Fort Lauderdale, FL 33304</p>
                <p>Email: <a href="mailto:info@cdljobscenter.com" className="text-primary hover:underline">info@cdljobscenter.com</a></p>
                <p>Phone: <a href="tel:+16189360241" className="text-primary hover:underline">+1 618-936-0241</a></p>
              </div>
            </Section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
