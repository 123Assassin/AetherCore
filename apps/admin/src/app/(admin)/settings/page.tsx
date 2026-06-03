import { PasswordSettingsForm } from '../../../components/settings/password-settings-form';
import { SignOutPanel } from '../../../components/settings/sign-out-panel';

export default function AdminSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-10 pb-20">
      <PasswordSettingsForm />
      <SignOutPanel />
    </main>
  );
}
