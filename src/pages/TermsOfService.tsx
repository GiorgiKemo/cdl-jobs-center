import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

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

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto py-8 max-w-3xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Terms of Service
        </p>

        <div className="border border-border bg-card">
          <div className="border-l-4 border-l-primary border-b border-b-border px-5 py-4">
            <h1 className="font-display font-bold text-xl">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: February 27, 2026</p>
          </div>

          <div className="px-5 py-8">

            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              These Terms of Service ("Terms") govern your access to and use of the CDL Jobs Center website and services operated by CDL Jobs Center ("Company," "we," "us," or "our"). By accessing or using our platform, you agree to be bound by these Terms. If you do not agree, do not use our services.
            </p>

            <Section title="1. Eligibility">
              <p>To use CDL Jobs Center, you must:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Be at least 18 years of age</li>
                <li>Hold or be actively pursuing a valid Commercial Driver's License (CDL) issued in the United States, OR be a representative of a licensed trucking company or carrier</li>
                <li>Provide accurate, current, and complete information during registration and maintain the accuracy of such information</li>
                <li>Have the legal capacity to enter into a binding agreement</li>
              </ul>
            </Section>

            <Section title="2. Description of Service">
              <p>CDL Jobs Center is an online job matching platform that connects commercial truck drivers with trucking companies and carriers. Our services include:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Driver profile creation and management</li>
                <li>Job listing browsing and filtering by freight type, route type, driver type, and other criteria</li>
                <li>Application submission to one or multiple carriers</li>
                <li>Job alerts and newsletters (opt-in)</li>
                <li>Company directory and carrier profiles</li>
              </ul>
              <p className="mt-2">We act as an intermediary platform. We are not an employer and we do not guarantee employment or any specific job outcome. All hiring decisions are made solely by the carriers and companies listed on our platform.</p>
            </Section>

            <Section title="3. User Accounts">
              <p>When you create an account, you agree to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Provide truthful and accurate information, including your CDL credentials and driving history</li>
                <li>Keep your login credentials confidential and not share them with any third party</li>
                <li>Notify us immediately of any unauthorized use of your account at <a href="mailto:info@cdljobscenter.com" className="text-primary hover:underline">info@cdljobscenter.com</a></li>
                <li>Be solely responsible for all activity that occurs under your account</li>
              </ul>
              <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these Terms, provide false information, or engage in prohibited conduct.</p>
            </Section>

            <Section title="4. Acceptable Use">
              <p>You agree to use CDL Jobs Center only for lawful purposes and in accordance with these Terms. You must not:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Submit false, misleading, or fraudulent information in your profile or applications</li>
                <li>Impersonate any person or entity, or misrepresent your CDL status, experience, or qualifications</li>
                <li>Use our platform to harass, threaten, or harm other users or company representatives</li>
                <li>Scrape, crawl, or systematically extract data from our platform without written permission</li>
                <li>Post or transmit any content that is unlawful, defamatory, obscene, or otherwise objectionable</li>
                <li>Attempt to gain unauthorized access to our systems or interfere with the proper functioning of the platform</li>
                <li>Use our platform to advertise or solicit unrelated commercial services</li>
              </ul>
            </Section>

            <Section title="5. Applications and Carrier Relationships">
              <p>When you submit an application through CDL Jobs Center, you authorize us to share your profile information with the selected carrier(s). You acknowledge that:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Carriers may conduct background checks, MVR reviews, and drug/alcohol screenings as permitted by law</li>
                <li>We are not responsible for a carrier's hiring decisions, the accuracy of job listings, or the terms of any employment offer</li>
                <li>Any employment relationship formed is solely between you and the carrier</li>
                <li>We do not guarantee that submitting an application will result in contact, an interview, or a job offer</li>
              </ul>
            </Section>

            <Section title="6. Company Listings">
              <p>Trucking companies and carriers that list jobs on CDL Jobs Center agree to provide accurate, current job information and comply with all applicable employment laws, including non-discrimination requirements. We reserve the right to remove any listing that violates our guidelines or applicable law.</p>
            </Section>

            <Section title="7. Intellectual Property">
              <p>All content on CDL Jobs Center — including text, graphics, logos, icons, and software — is the property of CDL Jobs Center or its content suppliers and is protected by United States and international copyright laws. You may not reproduce, distribute, modify, or create derivative works without our express written permission.</p>
              <p className="mt-2">By submitting content to our platform (such as profile information or reviews), you grant CDL Jobs Center a non-exclusive, royalty-free license to use, display, and distribute that content in connection with our services.</p>
            </Section>

            <Section title="8. Disclaimer of Warranties">
              <p>CDL Jobs Center is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not warrant that:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>The platform will be uninterrupted, error-free, or free of viruses or other harmful components</li>
                <li>Job listings are accurate, complete, or current</li>
                <li>The results of using our platform will meet your expectations or requirements</li>
              </ul>
              <p className="mt-2">Your use of the platform is at your sole risk. To the fullest extent permitted by applicable law, we disclaim all warranties, express or implied.</p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>To the maximum extent permitted by law, CDL Jobs Center and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including lost profits, lost data, or loss of employment opportunity — arising out of or related to your use of the platform, even if we have been advised of the possibility of such damages.</p>
              <p className="mt-2">Our total liability for any claim arising out of or relating to these Terms or the platform shall not exceed the amount you paid us, if any, in the twelve months preceding the claim.</p>
            </Section>

            <Section title="10. Indemnification">
              <p>You agree to defend, indemnify, and hold harmless CDL Jobs Center and its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the platform; (b) your violation of these Terms; (c) any information you submit to the platform; or (d) your violation of any third-party rights.</p>
            </Section>

            <Section title="11. Termination">
              <p>We may suspend or terminate your account and access to the platform at any time, with or without cause or notice, including for violation of these Terms. Upon termination, your right to use the platform ceases immediately. Provisions that by their nature should survive termination — including intellectual property, disclaimer of warranties, limitation of liability, and indemnification — shall survive.</p>
            </Section>

            <Section title="12. Governing Law and Disputes">
              <p>These Terms are governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law principles. Any dispute arising out of or relating to these Terms or the platform shall be resolved through binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, with proceedings conducted in Broward County, Florida. You waive any right to a jury trial or to participate in a class action lawsuit.</p>
            </Section>

            <Section title="13. Changes to These Terms">
              <p>We reserve the right to modify these Terms at any time. We will post the updated Terms on this page and update the "last updated" date. If changes are material, we will notify registered users by email. Your continued use of the platform after the effective date of any changes constitutes acceptance of the revised Terms.</p>
            </Section>

            <Section title="14. Contact Us">
              <p>If you have questions about these Terms of Service, please contact us:</p>
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

export default TermsOfService;
