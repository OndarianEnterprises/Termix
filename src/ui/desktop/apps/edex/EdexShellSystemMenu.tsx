import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

interface EdexShellSystemMenuProps {
  disabled?: boolean;
  isAdmin?: boolean;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenSshManager: () => void;
  onOpenHostsOverlay: () => void;
}

/**
 * Fiction-styled routing menu (eDEX “console” entry points to existing Termix tabs / panels).
 */
export function EdexShellSystemMenu({
  disabled = false,
  isAdmin = false,
  onOpenProfile,
  onOpenAdmin,
  onOpenSshManager,
  onOpenHostsOverlay,
}: EdexShellSystemMenuProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 shrink-0 cursor-pointer border-edge px-3 font-mono text-[0.65rem] tracking-[0.22em] sm:text-[0.6rem] sm:tracking-[0.28em]"
          disabled={disabled}
          title={t("edex.systemMenu.triggerTitle")}
          aria-label={t("edex.systemMenu.triggerTitle")}
        >
          {t("edex.systemMenu.trigger")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[240px] border border-border bg-popover text-popover-foreground"
      >
        <DropdownMenuLabel className="font-mono text-[0.6rem] tracking-[0.35em] text-muted-foreground">
          {t("edex.systemMenu.section")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={disabled}
          className="cursor-pointer font-mono text-xs tracking-wide"
          onSelect={() => {
            onOpenProfile();
          }}
        >
          {t("edex.systemMenu.profile")}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem
            disabled={disabled}
            className="cursor-pointer font-mono text-xs tracking-wide"
            onSelect={() => {
              onOpenAdmin();
            }}
          >
            {t("edex.systemMenu.admin")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={disabled}
          className="cursor-pointer font-mono text-xs tracking-wide"
          onSelect={() => {
            onOpenHostsOverlay();
          }}
        >
          {t("edex.systemMenu.hostsOverlay")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled}
          className="cursor-pointer font-mono text-xs tracking-wide"
          onSelect={() => {
            onOpenSshManager();
          }}
        >
          {t("edex.systemMenu.hostMatrix")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
