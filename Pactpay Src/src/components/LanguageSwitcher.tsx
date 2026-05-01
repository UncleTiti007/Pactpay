import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

interface LanguageSwitcherProps {
  /** If true, shows full label + flag. If false, shows just globe icon (for navbars). */
  compact?: boolean;
  /** If provided, saves to Supabase on change (for logged-in users). */
  saveToProfile?: boolean;
}

const LanguageSwitcher = ({ compact = false, saveToProfile = false }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleChange = async (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("pactpay_language", code);

    if (saveToProfile && user) {
      const { error } = await supabase
        .from("profiles")
        .update({ language: code })
        .eq("id", user.id);

      if (!error) {
        toast.success(t("profile.languageSaved"));
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="h-9 rounded-full bg-card/50 ring-1 ring-border/50 hover:ring-primary/30 transition-all gap-2"
        >
          {compact ? (
            <Globe className="h-4 w-4 text-muted-foreground" />
          ) : (
            <>
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="text-sm font-medium">{currentLang.label}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 max-h-80 overflow-y-auto bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl"
      >
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              i18n.language === lang.code
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-muted/50"
            }`}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="text-sm">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
