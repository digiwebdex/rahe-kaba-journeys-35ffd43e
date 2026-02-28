import { User } from "lucide-react";

interface PersonalInfo {
  fullName: string;
  phone: string;
  passportNumber: string;
  address: string;
}

interface Props {
  info: PersonalInfo;
  onChange: (info: PersonalInfo) => void;
}

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const PersonalDetailsStep = ({ info, onChange }: Props) => {
  const update = (field: keyof PersonalInfo, value: string) =>
    onChange({ ...info, [field]: value });

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="font-heading text-lg font-bold mb-2 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" /> Personal Details
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="Enter your full name"
            value={info.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Phone Number <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            required
            maxLength={15}
            placeholder="+880 1XXX-XXXXXX"
            value={info.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Passport Number (optional)
          </label>
          <input
            type="text"
            required={false}
            maxLength={20}
            placeholder="Passport number"
            value={info.passportNumber}
            onChange={(e) => update("passportNumber", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Address</label>
          <input
            type="text"
            maxLength={200}
            placeholder="Your address"
            value={info.address}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailsStep;
export type { PersonalInfo };
