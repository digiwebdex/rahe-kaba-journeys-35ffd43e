import { useState, useEffect } from "react";
import { useAllSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Type, FileText, Globe, Phone, MapPin, Languages, Image, MessageCircle, Star, BookOpen, Video, Shield, Layout, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Language } from "@/i18n/translations";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "array" | "string_array";
  bilingual?: boolean;
  arrayFields?: { key: string; label: string; type: string }[];
}

const SECTION_CONFIG: Record<string, { label: string; labelBn: string; icon: any; fields: FieldConfig[] }> = {
  hero: {
    label: "Hero Section",
    labelBn: "হিরো সেকশন",
    icon: Type,
    fields: [
      { key: "badge", label: "Badge Text", type: "text", bilingual: true },
      { key: "heading_line1", label: "Heading Line 1", type: "text", bilingual: true },
      { key: "heading_line2", label: "Heading Line 2", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "subheading", label: "Subheading", type: "textarea", bilingual: true },
      { key: "quran_arabic", label: "Quranic Verse (Arabic)", type: "text", bilingual: false },
      { key: "quran_translation", label: "Quranic Verse Translation", type: "text", bilingual: true },
      { key: "quran_reference", label: "Quran Reference", type: "text", bilingual: true },
      { key: "cta_primary", label: "Primary Button Text", type: "text", bilingual: true },
      { key: "cta_secondary", label: "Secondary Button Text", type: "text", bilingual: true },
      { key: "stats", label: "Stats", type: "array", bilingual: true, arrayFields: [
        { key: "value", label: "Value", type: "text" },
        { key: "label", label: "Label", type: "text" },
      ]},
    ],
  },
  navbar: {
    label: "Navbar",
    labelBn: "নেভিগেশন বার",
    icon: Navigation,
    fields: [
      { key: "company_name", label: "Company Name", type: "text", bilingual: false },
      { key: "company_tagline", label: "Company Tagline", type: "text", bilingual: true },
      { key: "phone", label: "Phone Number", type: "text", bilingual: false },
      { key: "cta_text", label: "CTA Button Text", type: "text", bilingual: true },
      { key: "nav_links", label: "Navigation Links", type: "array", bilingual: true, arrayFields: [
        { key: "label", label: "Link Label", type: "text" },
        { key: "href", label: "Link URL", type: "text" },
      ]},
    ],
  },
  services: {
    label: "Services Section",
    labelBn: "সেবা সেকশন",
    icon: Globe,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "items", label: "Service Items", type: "array", bilingual: true, arrayFields: [
        { key: "icon", label: "Icon Name (BookOpen/Globe/CreditCard/Plane/Building2/Bus/MapPin/Users)", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "desc", label: "Description", type: "text" },
      ]},
    ],
  },
  about: {
    label: "About Section",
    labelBn: "আমাদের সম্পর্কে",
    icon: FileText,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "track_title", label: "Tracking Box Title", type: "text", bilingual: true },
      { key: "track_description", label: "Tracking Box Description", type: "text", bilingual: true },
      { key: "reasons", label: "Reasons/Features", type: "array", bilingual: true, arrayFields: [
        { key: "title", label: "Title", type: "text" },
        { key: "desc", label: "Description", type: "text" },
      ]},
    ],
  },
  packages: {
    label: "Packages Section",
    labelBn: "প্যাকেজ সেকশন",
    icon: Layout,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "book_now_text", label: "Book Now Button Text", type: "text", bilingual: true },
      { key: "view_all_text", label: "View All Button Text", type: "text", bilingual: true },
    ],
  },
  testimonials: {
    label: "Testimonials Section",
    labelBn: "প্রশংসাপত্র সেকশন",
    icon: Star,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "items", label: "Testimonials", type: "array", bilingual: false, arrayFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "location", label: "Location", type: "text" },
        { key: "text", label: "Review Text", type: "text" },
        { key: "rating", label: "Rating (1-5)", type: "text" },
        { key: "trip", label: "Trip Type", type: "text" },
      ]},
    ],
  },
  facilities: {
    label: "Facilities Section",
    labelBn: "সুবিধা সেকশন",
    icon: Shield,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "items", label: "Facility Items", type: "array", bilingual: true, arrayFields: [
        { key: "icon", label: "Icon (Shield/Plane/Hotel/Car/BookOpen/Users/Headphones/CreditCard/Heart)", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "desc", label: "Description", type: "text" },
      ]},
    ],
  },
  gallery: {
    label: "Gallery Section",
    labelBn: "গ্যালারি সেকশন",
    icon: Image,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "items", label: "Gallery Items (type: image/video)", type: "array", bilingual: false, arrayFields: [
        { key: "type", label: "Type (image/video)", type: "text" },
        { key: "src", label: "File Path or URL", type: "text" },
      ]},
    ],
  },
  guideline: {
    label: "Umrah Guideline Section",
    labelBn: "ওমরাহ গাইডলাইন সেকশন",
    icon: BookOpen,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "steps", label: "Step-by-Step Guide", type: "array", bilingual: true, arrayFields: [
        { key: "num", label: "Step Number", type: "text" },
        { key: "title", label: "Step Title", type: "text" },
        { key: "desc", label: "Step Description", type: "text" },
      ]},
      { key: "dos", label: "Do's List", type: "string_array", bilingual: true },
      { key: "donts", label: "Don'ts List", type: "string_array", bilingual: true },
    ],
  },
  video_guide: {
    label: "Video Guide Section",
    labelBn: "ভিডিও গাইড সেকশন",
    icon: Video,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "tutorials", label: "Video Tutorials", type: "array", bilingual: true, arrayFields: [
        { key: "title", label: "Video Title", type: "text" },
        { key: "desc", label: "Video Description", type: "text" },
        { key: "thumbnail", label: "Thumbnail Path/URL", type: "text" },
        { key: "src", label: "Video Source Path/URL", type: "text" },
      ]},
    ],
  },
  contact: {
    label: "Contact Section",
    labelBn: "যোগাযোগ সেকশন",
    icon: Phone,
    fields: [
      { key: "section_label", label: "Section Label", type: "text", bilingual: true },
      { key: "heading", label: "Heading", type: "text", bilingual: true },
      { key: "heading_highlight", label: "Heading Highlight", type: "text", bilingual: true },
      { key: "phone", label: "Phone", type: "text", bilingual: false },
      { key: "email", label: "Email", type: "text", bilingual: false },
      { key: "location", label: "Location", type: "textarea", bilingual: true },
      { key: "hours", label: "Working Hours", type: "text", bilingual: true },
      { key: "form_services", label: "Contact Form Service Options", type: "string_array", bilingual: true },
    ],
  },
  whatsapp: {
    label: "WhatsApp Button",
    labelBn: "হোয়াটসঅ্যাপ বাটন",
    icon: MessageCircle,
    fields: [
      { key: "phone", label: "WhatsApp Number (with country code, no +)", type: "text", bilingual: false },
      { key: "message", label: "Default Message", type: "text", bilingual: true },
      { key: "button_text", label: "Button Label Text", type: "text", bilingual: true },
    ],
  },
  footer: {
    label: "Footer",
    labelBn: "ফুটার",
    icon: MapPin,
    fields: [
      { key: "company_name", label: "Company Name", type: "text", bilingual: false },
      { key: "company_tagline", label: "Tagline", type: "text", bilingual: true },
      { key: "description", label: "Description", type: "textarea", bilingual: true },
      { key: "phone", label: "Phone", type: "text", bilingual: false },
      { key: "email", label: "Email", type: "text", bilingual: false },
      { key: "address", label: "Address", type: "textarea", bilingual: true },
      { key: "facebook_url", label: "Facebook URL", type: "text", bilingual: false },
      { key: "services_list", label: "Services List (one per line)", type: "string_array", bilingual: true },
      { key: "developer_name", label: "Developer Name", type: "text", bilingual: false },
      { key: "developer_url", label: "Developer URL", type: "text", bilingual: false },
    ],
  },
  privacy_policy: {
    label: "Privacy Policy",
    labelBn: "গোপনীয়তা নীতি",
    icon: Shield,
    fields: [
      { key: "title", label: "Page Title", type: "text", bilingual: true },
      { key: "last_updated", label: "Last Updated Date", type: "text", bilingual: false },
      { key: "sections", label: "Content Sections", type: "array", bilingual: true, arrayFields: [
        { key: "heading", label: "Section Heading", type: "text" },
        { key: "body", label: "Section Body", type: "text" },
      ]},
    ],
  },
  terms_conditions: {
    label: "Terms & Conditions",
    labelBn: "শর্তাবলী",
    icon: FileText,
    fields: [
      { key: "title", label: "Page Title", type: "text", bilingual: true },
      { key: "last_updated", label: "Last Updated Date", type: "text", bilingual: false },
      { key: "sections", label: "Content Sections", type: "array", bilingual: true, arrayFields: [
        { key: "heading", label: "Section Heading", type: "text" },
        { key: "body", label: "Section Body", type: "text" },
      ]},
    ],
  },
  refund_policy: {
    label: "Refund Policy",
    labelBn: "রিফান্ড নীতি",
    icon: Shield,
    fields: [
      { key: "title", label: "Page Title", type: "text", bilingual: true },
      { key: "last_updated", label: "Last Updated Date", type: "text", bilingual: false },
      { key: "sections", label: "Content Sections", type: "array", bilingual: true, arrayFields: [
        { key: "heading", label: "Section Heading", type: "text" },
        { key: "body", label: "Section Body", type: "text" },
      ]},
    ],
  },
};

const AdminCmsEditor = () => {
  const { data: allContent, isLoading, isError } = useAllSiteContent();
  const updateMutation = useUpdateSiteContent();
  const [editState, setEditState] = useState<Record<string, any>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>("hero");
  const [editLang, setEditLang] = useState<Language>("bn");

  useEffect(() => {
    if (allContent) {
      setEditState({ ...allContent });
    }
  }, [allContent]);

  const getFieldValue = (sectionData: any, field: FieldConfig) => {
    if (!field.bilingual) {
      return sectionData?.[field.key] ?? "";
    }
    const langData = sectionData?.[editLang];
    if (langData && langData[field.key] !== undefined) {
      return langData[field.key];
    }
    return sectionData?.[field.key] ?? "";
  };

  const setFieldValue = (section: string, field: FieldConfig, value: any) => {
    setEditState((prev) => {
      const sectionData = { ...prev[section] };
      if (!field.bilingual) {
        sectionData[field.key] = value;
      } else {
        if (!sectionData[editLang]) sectionData[editLang] = {};
        sectionData[editLang] = { ...sectionData[editLang], [field.key]: value };
      }
      return { ...prev, [section]: sectionData };
    });
  };

  const handleArrayItemChange = (section: string, field: FieldConfig, index: number, fieldKey: string, value: string) => {
    setEditState((prev) => {
      const sectionData = { ...prev[section] };
      if (field.bilingual) {
        if (!sectionData[editLang]) sectionData[editLang] = {};
        const arr = [...(sectionData[editLang][field.key] || sectionData[field.key] || [])];
        arr[index] = { ...arr[index], [fieldKey]: value };
        sectionData[editLang] = { ...sectionData[editLang], [field.key]: arr };
      } else {
        const arr = [...(sectionData[field.key] || [])];
        arr[index] = { ...arr[index], [fieldKey]: value };
        sectionData[field.key] = arr;
      }
      return { ...prev, [section]: sectionData };
    });
  };

  const handleAddArrayItem = (section: string, field: FieldConfig) => {
    const newItem: any = {};
    field.arrayFields!.forEach((f) => (newItem[f.key] = ""));
    setEditState((prev) => {
      const sectionData = { ...prev[section] };
      if (field.bilingual) {
        if (!sectionData[editLang]) sectionData[editLang] = {};
        const arr = [...(sectionData[editLang][field.key] || sectionData[field.key] || [])];
        arr.push(newItem);
        sectionData[editLang] = { ...sectionData[editLang], [field.key]: arr };
      } else {
        const arr = [...(sectionData[field.key] || [])];
        arr.push(newItem);
        sectionData[field.key] = arr;
      }
      return { ...prev, [section]: sectionData };
    });
  };

  const handleRemoveArrayItem = (section: string, field: FieldConfig, index: number) => {
    setEditState((prev) => {
      const sectionData = { ...prev[section] };
      if (field.bilingual) {
        if (!sectionData[editLang]) sectionData[editLang] = {};
        const arr = [...(sectionData[editLang][field.key] || sectionData[field.key] || [])];
        arr.splice(index, 1);
        sectionData[editLang] = { ...sectionData[editLang], [field.key]: arr };
      } else {
        const arr = [...(sectionData[field.key] || [])];
        arr.splice(index, 1);
        sectionData[field.key] = arr;
      }
      return { ...prev, [section]: sectionData };
    });
  };

  const handleStringArrayChange = (section: string, field: FieldConfig, value: string) => {
    const arr = value.split("\n").filter(Boolean);
    setFieldValue(section, field, arr);
  };

  const getArrayItems = (sectionData: any, field: FieldConfig) => {
    if (field.bilingual) {
      return sectionData?.[editLang]?.[field.key] || sectionData?.[field.key] || [];
    }
    return sectionData?.[field.key] || [];
  };

  const getStringArrayValue = (sectionData: any, field: FieldConfig) => {
    if (field.bilingual) {
      const arr = sectionData?.[editLang]?.[field.key] || sectionData?.[field.key] || [];
      return Array.isArray(arr) ? arr.join("\n") : "";
    }
    const arr = sectionData?.[field.key] || [];
    return Array.isArray(arr) ? arr.join("\n") : "";
  };

  const handleSave = (sectionKey: string) => {
    updateMutation.mutate({ sectionKey, content: editState[sectionKey] || {} });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground text-sm">কন্টেন্ট লোড হচ্ছে...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-destructive font-medium">কন্টেন্ট লোড করা যায়নি</p>
        <p className="text-muted-foreground text-sm">সার্ভার সংযোগ চেক করুন এবং পুনরায় চেষ্টা করুন।</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">পুনরায় চেষ্টা করুন</button>
          <button onClick={() => {
            setEditState({});
            // Allow editing even without loaded data - sections will save as new
          }} className="bg-secondary text-foreground border border-border px-4 py-2 rounded-md text-sm">নতুন কন্টেন্ট তৈরি করুন</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-heading text-lg font-bold">ওয়েবসাইট কন্টেন্ট ম্যানেজার</h3>
          <p className="text-xs text-muted-foreground">{Object.keys(SECTION_CONFIG).length} টি সেকশন এডিট করতে পারবেন</p>
        </div>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <div className="flex bg-secondary rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setEditLang("bn")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${editLang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setEditLang("en")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${editLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        {editLang === "bn" ? "বাংলা কন্টেন্ট এডিট করছেন — ভাষা-নির্দিষ্ট ফিল্ডগুলো 🇧🇩 চিহ্নিত" : "Editing English content — Language-specific fields marked with 🇬🇧"}
      </p>

      {Object.entries(SECTION_CONFIG).map(([sectionKey, config]) => {
        const isExpanded = expandedSection === sectionKey;
        const sectionData = editState[sectionKey] || {};
        const hasChanges = JSON.stringify(sectionData) !== JSON.stringify(allContent?.[sectionKey] || {});

        return (
          <div key={sectionKey} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <config.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{editLang === "bn" ? config.labelBn : config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.fields.length} টি ফিল্ড</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                    {editLang === "bn" ? "অসংরক্ষিত" : "Unsaved"}
                  </span>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border p-5 space-y-4">
                {config.fields.map((field) => {
                  const langFlag = field.bilingual ? (editLang === "bn" ? " 🇧🇩" : " 🇬🇧") : "";

                  return (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                        {field.label}{langFlag}
                        {field.bilingual && (
                          <span className="text-[10px] ml-1 text-primary/60">({editLang === "bn" ? "বাংলা" : "English"})</span>
                        )}
                      </label>

                      {field.type === "text" && (
                        <input
                          className={inputClass}
                          value={getFieldValue(sectionData, field)}
                          onChange={(e) => setFieldValue(sectionKey, field, e.target.value)}
                          dir={editLang === "bn" ? "auto" : "ltr"}
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          className={inputClass}
                          rows={3}
                          value={getFieldValue(sectionData, field)}
                          onChange={(e) => setFieldValue(sectionKey, field, e.target.value)}
                          dir={editLang === "bn" ? "auto" : "ltr"}
                        />
                      )}

                      {field.type === "string_array" && (
                        <textarea
                          className={inputClass}
                          rows={4}
                          placeholder={editLang === "bn" ? "প্রতি লাইনে একটি আইটেম" : "One item per line"}
                          value={getStringArrayValue(sectionData, field)}
                          onChange={(e) => handleStringArrayChange(sectionKey, field, e.target.value)}
                          dir={editLang === "bn" ? "auto" : "ltr"}
                        />
                      )}

                      {field.type === "array" && field.arrayFields && (
                        <div className="space-y-3">
                          {getArrayItems(sectionData, field).map((item: any, idx: number) => (
                            <div key={idx} className="bg-secondary/30 rounded-lg p-3 flex gap-3 items-start">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mt-4">
                                {idx + 1}
                              </div>
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {field.arrayFields!.map((af) => (
                                  <div key={af.key}>
                                    <label className="text-[10px] text-muted-foreground">{af.label}</label>
                                    <input
                                      className={inputClass}
                                      value={item[af.key] || ""}
                                      onChange={(e) => handleArrayItemChange(sectionKey, field, idx, af.key, e.target.value)}
                                      dir={editLang === "bn" ? "auto" : "ltr"}
                                    />
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => handleRemoveArrayItem(sectionKey, field, idx)}
                                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md mt-4"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleAddArrayItem(sectionKey, field)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> {editLang === "bn" ? "নতুন আইটেম যোগ করুন" : "Add New Item"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => handleSave(sectionKey)}
                  disabled={updateMutation.isPending}
                  className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 px-6 rounded-md text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending
                    ? (editLang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                    : (editLang === "bn" ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminCmsEditor;
