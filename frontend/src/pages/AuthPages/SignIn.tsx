import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { useLang } from "../../context/LanguageContext";

export default function SignIn() {
  const { t } = useLang();
  return (
    <>
      <PageMeta
        title={t("Sign In")}
        description={t("Sign in to the  dashboard.")}
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
