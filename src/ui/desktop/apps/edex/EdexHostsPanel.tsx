import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { FolderCard } from "@/ui/desktop/navigation/hosts/FolderCard.tsx";
import { getSSHHosts, getSSHFolders } from "@/ui/main-axios.ts";
import type { SSHFolder, SSHHost } from "@/types/index.ts";

interface EdexHostsPanelProps {
  disabled?: boolean;
}

export function EdexHostsPanel({
  disabled = false,
}: EdexHostsPanelProps): React.ReactElement {
  const { t } = useTranslation();

  const [hosts, setHosts] = React.useState<SSHHost[]>([]);
  const [hostsError, setHostsError] = React.useState<string | null>(null);
  const prevHostsRef = React.useRef<SSHHost[]>([]);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [folderMetadata, setFolderMetadata] = React.useState<Map<string, SSHFolder>>(
    new Map(),
  );

  const fetchFolderMetadata = React.useCallback(async () => {
    try {
      const folders = await getSSHFolders();
      const metadataMap = new Map<string, SSHFolder>();
      folders.forEach((folder) => {
        metadataMap.set(folder.name, folder);
      });
      setFolderMetadata(metadataMap);
    } catch (error) {
      console.error("Failed to fetch folder metadata:", error);
    }
  }, []);

  const fetchHosts = React.useCallback(async () => {
    try {
      const newHosts = await getSSHHosts();
      const prevHosts = prevHostsRef.current;

      const existingHostsMap = new Map(prevHosts.map((h) => [h.id, h]));
      const newHostsMap = new Map(newHosts.map((h) => [h.id, h]));

      let hasChanges = false;

      if (newHosts.length !== prevHosts.length) {
        hasChanges = true;
      } else {
        for (const [id, newHost] of newHostsMap) {
          const existingHost = existingHostsMap.get(id);
          if (!existingHost) {
            hasChanges = true;
            break;
          }

          if (
            newHost.name !== existingHost.name ||
            newHost.folder !== existingHost.folder ||
            newHost.ip !== existingHost.ip ||
            newHost.port !== existingHost.port ||
            newHost.username !== existingHost.username ||
            newHost.pin !== existingHost.pin ||
            newHost.enableTerminal !== existingHost.enableTerminal ||
            newHost.enableTunnel !== existingHost.enableTunnel ||
            newHost.enableFileManager !== existingHost.enableFileManager ||
            newHost.authType !== existingHost.authType ||
            newHost.password !== existingHost.password ||
            newHost.key !== existingHost.key ||
            newHost.keyPassword !== existingHost.keyPassword ||
            newHost.keyType !== existingHost.keyType ||
            newHost.defaultPath !== existingHost.defaultPath ||
            JSON.stringify(newHost.tags) !== JSON.stringify(existingHost.tags) ||
            JSON.stringify(newHost.tunnelConnections) !==
              JSON.stringify(existingHost.tunnelConnections)
          ) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        setTimeout(() => {
          setHosts(newHosts);
          prevHostsRef.current = newHosts;
        }, 50);
      }
    } catch {
      setHostsError(t("leftSidebar.failedToLoadHosts"));
    }
  }, [t]);

  const fetchHostsRef = React.useRef(fetchHosts);
  const fetchFolderMetadataRef = React.useRef(fetchFolderMetadata);

  React.useEffect(() => {
    fetchHostsRef.current = fetchHosts;
    fetchFolderMetadataRef.current = fetchFolderMetadata;
  });

  React.useEffect(() => {
    fetchHostsRef.current();
    fetchFolderMetadataRef.current();
    const interval = setInterval(() => {
      fetchHostsRef.current();
      fetchFolderMetadataRef.current();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handleHostsChanged = () => {
      fetchHostsRef.current();
      fetchFolderMetadataRef.current();
    };
    const handleCredentialsChanged = () => {
      fetchHostsRef.current();
    };
    const handleFoldersChanged = () => {
      fetchFolderMetadataRef.current();
    };
    window.addEventListener("ssh-hosts:changed", handleHostsChanged as EventListener);
    window.addEventListener(
      "credentials:changed",
      handleCredentialsChanged as EventListener,
    );
    window.addEventListener("folders:changed", handleFoldersChanged as EventListener);
    return () => {
      window.removeEventListener("ssh-hosts:changed", handleHostsChanged as EventListener);
      window.removeEventListener(
        "credentials:changed",
        handleCredentialsChanged as EventListener,
      );
      window.removeEventListener("folders:changed", handleFoldersChanged as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredHosts = React.useMemo(() => {
    if (!debouncedSearch.trim()) return hosts;
    const searchQuery = debouncedSearch.trim().toLowerCase();

    return hosts.filter((h) => {
      const fieldMatches: Record<string, string> = {};
      let remainingQuery = searchQuery;

      const fieldPattern = /(\w+):([^\s]+)/g;
      let match;
      while ((match = fieldPattern.exec(searchQuery)) !== null) {
        const [fullMatch, field, value] = match;
        fieldMatches[field] = value;
        remainingQuery = remainingQuery.replace(fullMatch, "").trim();
      }

      for (const [field, value] of Object.entries(fieldMatches)) {
        switch (field) {
          case "tag":
          case "tags": {
            const tags = Array.isArray(h.tags) ? h.tags : [];
            const hasMatchingTag = tags.some((tag) =>
              tag.toLowerCase().includes(value),
            );
            if (!hasMatchingTag) return false;
            break;
          }
          case "name":
            if (!(h.name || "").toLowerCase().includes(value)) return false;
            break;
          case "user":
          case "username":
            if (!h.username.toLowerCase().includes(value)) return false;
            break;
          case "ip":
          case "host":
            if (!h.ip.toLowerCase().includes(value)) return false;
            break;
          case "port":
            if (!String(h.port).includes(value)) return false;
            break;
          case "folder":
            if (!(h.folder || "").toLowerCase().includes(value)) return false;
            break;
          case "auth":
          case "authtype":
            if (!h.authType.toLowerCase().includes(value)) return false;
            break;
          case "path":
            if (!(h.defaultPath || "").toLowerCase().includes(value)) return false;
            break;
        }
      }

      if (remainingQuery) {
        const searchableText = [
          h.name || "",
          h.username,
          h.ip,
          h.folder || "",
          ...(h.tags || []),
          h.authType,
          h.defaultPath || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!searchableText.includes(remainingQuery)) return false;
      }

      return true;
    });
  }, [hosts, debouncedSearch]);

  const hostsByFolder = React.useMemo(() => {
    const map: Record<string, SSHHost[]> = {};
    filteredHosts.forEach((h) => {
      const folder = h.folder && h.folder.trim() ? h.folder : t("leftSidebar.noFolder");
      if (!map[folder]) map[folder] = [];
      map[folder].push(h);
    });
    return map;
  }, [filteredHosts, t]);

  const sortedFolders = React.useMemo(() => {
    const folders = Object.keys(hostsByFolder);
    folders.sort((a, b) => {
      if (a === t("leftSidebar.noFolder")) return -1;
      if (b === t("leftSidebar.noFolder")) return 1;
      return a.localeCompare(b);
    });
    return folders;
  }, [hostsByFolder, t]);

  const getSortedHosts = React.useCallback((arr: SSHHost[]) => {
    const pinned = arr
      .filter((h) => h.pin)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const rest = arr
      .filter((h) => !h.pin)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return [...pinned, ...rest];
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="px-1">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("placeholders.searchHostsAny")}
          className="w-full h-9 text-sm border-2 bg-field border-edge rounded-md"
          autoComplete="off"
          disabled={disabled}
        />
      </div>

      <Separator className="opacity-60" />

      {hostsError && (
        <div className="px-2 text-sm text-red-500">{t("leftSidebar.failedToLoadHosts")}</div>
      )}

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {sortedFolders.map((folder, idx) => {
          const metadata = folderMetadata.get(folder);
          return (
            <FolderCard
              key={`edex-folder-${folder}`}
              folderName={folder}
              hosts={getSortedHosts(hostsByFolder[folder])}
              isFirst={idx === 0}
              isLast={idx === sortedFolders.length - 1}
              folderColor={metadata?.color}
              folderIcon={metadata?.icon}
            />
          );
        })}
      </div>
    </div>
  );
}
