import { useEffect } from "react";

const BASE_TITLE = "CDL Jobs Center";
const BASE_URL = "https://cdljobscenter.com";
const BASE_DESC = "Find top CDL trucking jobs — AI-powered matching for drivers across the USA.";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [title]);
}

/** Set meta description for SEO — call once per page */
export function useMetaDescription(description: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) meta.content = description;
    return () => { if (meta) meta.content = BASE_DESC; };
  }, [description]);
}

/** Set canonical URL for SEO — prevents duplicate content issues */
export function useCanonical(path: string) {
  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const url = `${BASE_URL}${path}`;
    if (link) link.href = url;
    return () => { if (link) link.href = `${BASE_URL}/`; };
  }, [path]);
}

/** Add noindex meta tag — prevents Google from indexing auth-gated pages */
export function useNoIndex() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
    return () => { meta?.remove(); };
  }, []);
}
