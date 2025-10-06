import React from "react";
import { Input } from "@/components/ui/input";

export type LeadInfo = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailId: string;
};

export type LeadErrors = Partial<Record<keyof LeadInfo, string>>;

type Props = {
  value: LeadInfo;
  onChange: (next: LeadInfo) => void;
  errors?: LeadErrors;
};

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block mb-1 font-medium">
    {children} {required && <span className="text-red-600">*</span>}
  </label>
);

const StaticLeadFields: React.FC<Props> = ({ value, onChange, errors }) => {
  const set = <K extends keyof LeadInfo>(key: K, v: string) => onChange({ ...value, [key]: v });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* First Name (required) */}
      <div className="mt-2">
        <Label required>First Name</Label>
        <Input
          placeholder="Enter First Name"
          value={value.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          minLength={3}
          maxLength={200}
          autoComplete="off"
        />
        {errors?.firstName && <small className="text-red-600">{errors.firstName}</small>}
      </div>

      {/* Last Name (optional) */}
      <div className="mt-2">
        <Label>Last Name</Label>
        <Input
          placeholder="Enter Last Name"
          value={value.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          minLength={1}
          maxLength={200}
          autoComplete="off"
        />
        {errors?.lastName && <small className="text-red-600">{errors.lastName}</small>}
      </div>

      {/* Phone (required) */}
      <div className="mt-2">
        <Label required>Phone</Label>
        {/* Replace with your preferred phone input if needed */}
        <Input
          placeholder="Enter Phone Number"
          value={value.phoneNumber}
          onChange={(e) => set("phoneNumber", e.target.value)}
          inputMode="tel"
          autoComplete="tel"
        />
        {errors?.phoneNumber && <small className="text-red-600">{errors.phoneNumber}</small>}
      </div>

      {/* Email (optional) */}
      <div className="mt-2">
        <Label>Email Id</Label>
        <Input
          placeholder="Enter Email Id"
          value={value.emailId}
          onChange={(e) => set("emailId", e.target.value)}
          type="email"
          autoComplete="email"
          minLength={1}
          maxLength={200}
        />
        {errors?.emailId && <small className="text-red-600">{errors.emailId}</small>}
      </div>
    </div>
  );
};

export default StaticLeadFields;
