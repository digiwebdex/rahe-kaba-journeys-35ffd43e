import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";
import { initFBPixel, trackFBEvent, type FBPixelConfig, DEFAULT_FB_CONFIG } from "@/lib/fbPixel";

export default function FacebookPixelProvider() {
  const { data: seoSettings } = useSiteContent("seo_settings");
  const location = useLocation();
  const initialized = useRef(false);

  const fbConfig: FBPixelConfig = {
    ...DEFAULT_FB_CONFIG,
    ...(seoSettings?.facebook_pixel as FBPixelConfig || {}),
  };

  // Initialize pixel
  useEffect(() => {
    if (fbConfig.enabled && fbConfig.pixel_id && !initialized.current) {
      initFBPixel(fbConfig.pixel_id);
      initialized.current = true;
    }
  }, [fbConfig.enabled, fbConfig.pixel_id]);

  // Track PageView on route change
  useEffect(() => {
    if (initialized.current && fbConfig.track_page_view) {
      trackFBEvent("PageView");
    }
  }, [location.pathname, fbConfig.track_page_view]);

  return null; // No UI
}
