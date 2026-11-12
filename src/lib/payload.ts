/**
 * Payload builders. Each content type maps a small form onto the de-facto
 * string format that phone camera apps recognise.
 */

export type ContentType = "url" | "text" | "wifi" | "email" | "phone" | "sms";

export interface PayloadFields {
  url: string;
  text: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: "WPA" | "WEP" | "nopass";
  wifiHidden: boolean;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  phone: string;
  smsNumber: string;
  smsMessage: string;
}

export const emptyFields: PayloadFields = {
  url: "",
  text: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiSecurity: "WPA",
  wifiHidden: false,
  emailTo: "",
  emailSubject: "",
  emailBody: "",
  phone: "",
  smsNumber: "",
  smsMessage: "",
};

/** Wi-Fi strings reserve \ ; , : and " — they must be backslash-escaped. */
const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

const cleanPhone = (s: string) => s.replace(/[^\d+]/g, "");

export function buildPayload(type: ContentType, f: PayloadFields): string {
  switch (type) {
    case "url": {
      const v = f.url.trim();
      if (!v) return "";
      // Bare domains ("example.com") get https:// so phones open a browser.
      return /^[a-z][a-z0-9+.-]*:/i.test(v) || !/^[^\s]+\.[^\s]+$/.test(v)
        ? v
        : `https://${v}`;
    }
    case "text":
      return f.text;
    case "wifi": {
      if (!f.wifiSsid) return "";
      const pass = f.wifiSecurity === "nopass" ? "" : `P:${wifiEscape(f.wifiPassword)};`;
      return `WIFI:T:${f.wifiSecurity};S:${wifiEscape(f.wifiSsid)};${pass}${f.wifiHidden ? "H:true;" : ""};`;
    }
    case "email": {
      if (!f.emailTo.trim()) return "";
      const q = new URLSearchParams();
      if (f.emailSubject) q.set("subject", f.emailSubject);
      if (f.emailBody) q.set("body", f.emailBody);
      // URLSearchParams encodes spaces as "+", which mail clients show literally.
      const qs = q.toString().replace(/\+/g, "%20");
      return `mailto:${f.emailTo.trim()}${qs ? `?${qs}` : ""}`;
    }
    case "phone": {
      const n = cleanPhone(f.phone);
      return n ? `tel:${n}` : "";
    }
    case "sms": {
      const n = cleanPhone(f.smsNumber);
      return n ? `SMSTO:${n}:${f.smsMessage}` : "";
    }
  }
}
