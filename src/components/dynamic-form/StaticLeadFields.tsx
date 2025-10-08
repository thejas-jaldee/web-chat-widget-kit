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

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({
  children,
  required,
}) => (
  <label className="block mb-1 text-sm font-medium text-gray-800">
    {children} {required && <span className="text-red-600">*</span>}
  </label>
);

const StaticLeadFields: React.FC<Props> = ({ value, onChange, errors }) => {
  const set = <K extends keyof LeadInfo>(key: K, v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-4">
      {/* First Name */}
      <div>
        <Label required>First Name</Label>
        <Input
          placeholder="Enter First Name"
          value={value.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          minLength={3}
          maxLength={200}
          autoComplete="off"
          className="h-10"
        />
        {errors?.firstName && (
          <small className="text-red-600 text-xs mt-1 block">
            {errors.firstName}
          </small>
        )}
      </div>

      {/* Last Name */}
      <div>
        <Label>Last Name</Label>
        <Input
          placeholder="Enter Last Name"
          value={value.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          maxLength={200}
          autoComplete="off"
          className="h-10"
        />
        {errors?.lastName && (
          <small className="text-red-600 text-xs mt-1 block">
            {errors.lastName}
          </small>
        )}
      </div>

      {/* Phone */}
      <div>
        <Label required>Phone Number</Label>
        <Input
          placeholder="Enter Phone Number"
          value={value.phoneNumber}
          onChange={(e) => set("phoneNumber", e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          className="h-10"
        />
        {errors?.phoneNumber && (
          <small className="text-red-600 text-xs mt-1 block">
            {errors.phoneNumber}
          </small>
        )}
      </div>

      {/* Email */}
      <div>
        <Label>Email ID</Label>
        <Input
          placeholder="Enter Email ID"
          value={value.emailId}
          onChange={(e) => set("emailId", e.target.value)}
          type="email"
          autoComplete="email"
          className="h-10"
        />
        {errors?.emailId && (
          <small className="text-red-600 text-xs mt-1 block">
            {errors.emailId}
          </small>
        )}
      </div>
    </div>
  );
};

export default StaticLeadFields;
