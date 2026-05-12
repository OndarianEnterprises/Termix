import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import type { EdexConfig } from "@/ui/desktop/apps/edex/edexSettings.ts";
import {
  MAX_SHELL_THEME_IMPORT_JSON_CHARS,
  normalizeEdexThemeJson,
  parseShellThemeImportJson,
} from "@/ui/desktop/apps/edex/edexThemeJson.ts";

interface EdexShellQuickSettingsProps {
  config: EdexConfig;
  updateConfig: (partial: Partial<EdexConfig>) => void;
  disabled?: boolean;
}

export function EdexShellQuickSettings({
  config,
  updateConfig,
  disabled = false,
}: EdexShellQuickSettingsProps): React.ReactElement {
  const { t } = useTranslation();

  const importThemeFromClipboard = useCallback(async () => {
    if (disabled) {
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed.length) {
        toast.error(t("edex.shellSettings.themePasteEmpty"));
        return;
      }
      const parsed = parseShellThemeImportJson(trimmed);
      if (parsed === null) {
        toast.error(t("edex.shellSettings.themePasteInvalidJson"));
        return;
      }
      if (!normalizeEdexThemeJson(parsed).colors) {
        toast.error(t("edex.shellSettings.themePasteNoColors"));
        return;
      }
      const stored =
        trimmed.length > MAX_SHELL_THEME_IMPORT_JSON_CHARS
          ? trimmed.slice(0, MAX_SHELL_THEME_IMPORT_JSON_CHARS)
          : trimmed;
      updateConfig({ shellThemeImportJson: stored });
      toast.success(t("edex.shellSettings.themePasteSuccess"));
    } catch {
      toast.error(t("edex.shellSettings.themePasteClipboardDenied"));
    }
  }, [disabled, t, updateConfig]);

  const hasThemeImport = config.shellThemeImportJson.trim().length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 min-w-11 border-edge px-0 cursor-pointer"
          disabled={disabled}
          title={t("edex.shellSettings.trigger")}
          aria-label={t("edex.shellSettings.trigger")}
        >
          <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[260px] bg-popover text-popover-foreground border border-border max-h-[min(70vh,520px)] overflow-y-auto"
      >
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide">
          {t("edex.shellSettings.menuTitle")}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={config.enabled}
          disabled={disabled}
          onCheckedChange={(v) => updateConfig({ enabled: Boolean(v) })}
        >
          {t("edex.shellSettings.workspaceLayout")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.showKeyboardOverlay}
          disabled={disabled}
          onCheckedChange={(v) => updateConfig({ showKeyboardOverlay: Boolean(v) })}
        >
          {t("edex.shellSettings.keyboardHud")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.globeEnabled}
          disabled={disabled}
          onCheckedChange={(v) => updateConfig({ globeEnabled: Boolean(v) })}
        >
          {t("edex.shellSettings.globe")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.globeShowHostMarkers}
          disabled={disabled || !config.globeEnabled}
          onCheckedChange={(v) =>
            updateConfig({ globeShowHostMarkers: Boolean(v) })
          }
        >
          {t("edex.shellSettings.globeMarkers")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={config.shellBootSplash}
          disabled={disabled}
          onCheckedChange={(v) => updateConfig({ shellBootSplash: Boolean(v) })}
        >
          {t("edex.shellSettings.bootSplash")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.shellBootSplashOncePerSession}
          disabled={disabled || !config.shellBootSplash}
          onCheckedChange={(v) =>
            updateConfig({ shellBootSplashOncePerSession: Boolean(v) })
          }
        >
          {t("edex.shellSettings.bootOncePerSession")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.shellBootSoundEnabled}
          disabled={disabled || !config.shellBootSplash}
          onCheckedChange={(v) =>
            updateConfig({ shellBootSoundEnabled: Boolean(v) })
          }
        >
          {t("edex.shellSettings.bootSound")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.shellBootQuipEnabled}
          disabled={disabled || !config.shellBootSplash}
          onCheckedChange={(v) =>
            updateConfig({ shellBootQuipEnabled: Boolean(v) })
          }
        >
          {t("edex.shellSettings.bootQuips")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            disabled={
              disabled ||
              !config.shellBootSplash ||
              !config.shellBootSoundEnabled
            }
          >
            {t("edex.shellSettings.bootSoundVolume")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="w-56 p-3"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <label
              htmlFor="edex-shell-boot-sound-volume"
              className="mb-2 block text-xs text-muted-foreground"
            >
              {t("edex.shellSettings.bootSoundVolume")}{" "}
              <span className="tabular-nums">({config.shellBootSoundVolume}%)</span>
            </label>
            <Slider
              id="edex-shell-boot-sound-volume"
              value={[config.shellBootSoundVolume]}
              min={0}
              max={100}
              step={1}
              className="cursor-pointer"
              aria-label={t("edex.shellSettings.bootSoundVolumeA11y")}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onValueChange={(v) => {
                const n = v[0];
                if (typeof n === "number") {
                  updateConfig({ shellBootSoundVolume: n });
                }
              }}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={config.showFileBrowser}
          disabled={disabled || !config.enabled}
          onCheckedChange={(v) => updateConfig({ showFileBrowser: Boolean(v) })}
        >
          {t("edex.shellSettings.showFiles")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={config.showSystemStats}
          disabled={disabled || !config.enabled}
          onCheckedChange={(v) => updateConfig({ showSystemStats: Boolean(v) })}
        >
          {t("edex.shellSettings.showStats")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide">
          {t("edex.shellSettings.themeImportSection")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={disabled}
          className="cursor-pointer"
          onSelect={() => {
            void importThemeFromClipboard();
          }}
        >
          {t("edex.shellSettings.themePasteFromClipboard")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled || !hasThemeImport}
          className="cursor-pointer"
          onSelect={() => {
            updateConfig({ shellThemeImportJson: "" });
            toast.success(t("edex.shellSettings.themeClearSuccess"));
          }}
        >
          {t("edex.shellSettings.themeClearImport")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
