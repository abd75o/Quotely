"use client";

import { useState } from "react";
import type { RedacteurClient } from "./types";

interface NewClientFormProps {
  onComplete: (newClient: RedacteurClient, makeQuoteNow: boolean) => void;
}

type Step = "type" | "name" | "email" | "phone" | "confirm";

export function NewClientForm({ onComplete }: NewClientFormProps) {
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<"particulier" | "professionnel" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function buildClient(): RedacteurClient {
    return {
      id: `local-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      type: type ?? "particulier",
      meta: type === "professionnel" ? "Professionnel" : "Particulier",
    };
  }

  return (
    <div className="mt-2 rounded-xl border border-[var(--border)] bg-white p-3 shadow-sm">
      {step === "type" && (
        <div className="space-y-2">
          <p className="text-[13px] text-[var(--text-secondary)]">
            C&apos;est un particulier ou un pro ?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setType("particulier");
                setStep("name");
              }}
              className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-medium transition-colors hover:border-[#534AB7] hover:bg-[#EEEDFE]"
            >
              Particulier
            </button>
            <button
              type="button"
              onClick={() => {
                setType("professionnel");
                setStep("name");
              }}
              className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-medium transition-colors hover:border-[#534AB7] hover:bg-[#EEEDFE]"
            >
              Professionnel
            </button>
          </div>
        </div>
      )}

      {step === "name" && (
        <SingleField
          label="Son nom ?"
          value={name}
          onChange={setName}
          onSubmit={() => name.trim() && setStep("email")}
          placeholder="Ex : Marc Dupont"
        />
      )}

      {step === "email" && (
        <SingleField
          label="Son email ?"
          value={email}
          onChange={setEmail}
          onSubmit={() => email.trim() && setStep("phone")}
          placeholder="Ex : marc@exemple.fr"
          inputType="email"
        />
      )}

      {step === "phone" && (
        <div className="space-y-2">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Son téléphone (ou tape « passer ») ?
          </p>
          <input
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (phone.trim().toLowerCase() === "passer") setPhone("");
                setStep("confirm");
              }
            }}
            placeholder="06 12 34 56 78"
            className="w-full rounded-lg border border-[var(--border)] bg-gray-50 px-3 py-1.5 text-[13px] outline-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPhone("");
                setStep("confirm");
              }}
              className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Passer
            </button>
            <button
              type="button"
              onClick={() => setStep("confirm")}
              className="rounded-lg bg-[#534AB7] px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#3C3489]"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Récap : <strong>{name}</strong>
            {email && <> · {email}</>}
            {phone && <> · {phone}</>}
            {" "}({type === "professionnel" ? "Pro" : "Particulier"}).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onComplete(buildClient(), true)}
              className="rounded-lg bg-[#534AB7] px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#3C3489]"
            >
              Faire le devis maintenant
            </button>
            <button
              type="button"
              onClick={() => onComplete(buildClient(), false)}
              className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SingleField({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  inputType = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  inputType?: "text" | "email";
}) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-[var(--text-secondary)]">{label}</p>
      <input
        autoFocus
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-gray-50 px-3 py-1.5 text-[13px] outline-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim()}
        className="rounded-lg bg-[#534AB7] px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#3C3489] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Suivant
      </button>
    </div>
  );
}
