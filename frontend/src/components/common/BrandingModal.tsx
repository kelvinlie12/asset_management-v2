import { useEffect, useRef, useState, type ChangeEvent, type FC } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { Modal } from "../ui/modal";
import { useToast } from "../../hooks/useToast";
import { useLang } from "../../context/LanguageContext";
import { useBranding } from "../../context/BrandingContext";
import { extractApiError } from "../../utils/error";
import { TrashBinIcon } from "../../icons";
import { NexoraMark } from "./NexoraLogo";

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif";

/**
 * Modal that lets an owner or super admin replace the company logo shown in the
 * sidebar (and on the sign-in screen).
 */
const BrandingModal: FC = () => {
  const { t } = useLang();
  const { pushToast } = useToast();
  const { isModalOpen, closeModal, logoUrl, companyName, saveBranding } =
    useBranding();

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the form every time the modal opens.
  useEffect(() => {
    if (isModalOpen) {
      setName(companyName ?? "");
      setFile(null);
      setPreview(null);
      setRemoveLogo(false);
    }
  }, [isModalOpen, companyName]);

  // Preview a freshly picked file and release the object URL afterwards.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    if (picked) setRemoveLogo(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBranding({
        company_name: name.trim() ? name.trim() : null,
        logo: file,
        remove_logo: removeLogo,
      });
      pushToast("success", t("Company logo updated."));
      closeModal();
    } catch (err) {
      pushToast("error", extractApiError(err, t("Failed to update the logo.")));
    } finally {
      setSaving(false);
    }
  };

  const shownLogo = preview ?? (removeLogo ? null : logoUrl);
  const hasLogo = Boolean(shownLogo);

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} className="max-w-[500px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Company Logo")}
        </h4>
        <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t(
            "Upload your company logo. It replaces the default logo in the sidebar and on the sign-in screen.",
          )}
        </p>

        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-white/[0.04]">
              {shownLogo ? (
                <img
                  src={shownLogo}
                  alt={name || t("Company Logo")}
                  className="max-h-14 max-w-14 object-contain"
                />
              ) : (
                <NexoraMark size={32} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                {hasLogo ? t("Change Image") : t("Upload Logo")}
              </Button>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t("PNG, JPG, WEBP or GIF. Max 4 MB.")}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          <div>
            <Label>{t("Company Name")}</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. PT Graha Karya")}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {hasLogo ? (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setRemoveLogo(true);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-error-500 transition-colors hover:text-error-600"
            >
              <TrashBinIcon className="h-4 w-4" />
              {t("Remove Logo")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>
              {t("Cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BrandingModal;
