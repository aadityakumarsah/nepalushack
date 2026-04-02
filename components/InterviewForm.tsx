"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { personas } from "@/constants/personas";
import { Form } from "@/components/ui/form";
import FormField from "@/components/FormField";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  role: z.string().min(1, "Job role is required"),
  level: z.string().min(1, "Experience level is required"),
  type: z.string().min(1, "Interview type is required"),
  techstack: z.string().min(1, "Tech stack is required"),
  amount: z.coerce.number().min(1).max(10),
  persona: z.string().min(1, "Please select an interviewer persona"),
});

type FormData = z.infer<typeof formSchema>;

const InterviewForm = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "",
      level: "Junior",
      type: "Mixed",
      techstack: "",
      amount: 5,
      persona: "older-sibling",
    },
  });

  const selectedPersona = form.watch("persona");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: data.role,
          level: data.level,
          type: data.type,
          techstack: data.techstack,
          amount: data.amount,
          userid: userId,
        }),
      });

      const result = await response.json();
      if (result.success && result.interviewId) {
        router.push(
          `/interview/${result.interviewId}?persona=${data.persona}`
        );
      } else {
        console.error("Failed to generate interview");
      }
    } catch (error) {
      console.error("Error creating interview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8 w-full max-w-2xl"
      >
        {/* Basic fields */}
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="role"
            label="Job Role"
            placeholder="e.g. Frontend Developer"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">Experience Level</label>
              <select
                {...form.register("level")}
                className="input w-full mt-1"
              >
                <option value="Junior">Junior</option>
                <option value="Mid">Mid-level</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Interview Type</label>
              <select
                {...form.register("type")}
                className="input w-full mt-1"
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
          </div>
          <FormField
            control={form.control}
            name="techstack"
            label="Tech Stack"
            placeholder="e.g. React, TypeScript, Node.js"
          />
          <div>
            <label className="label">Number of Questions (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              className="input w-full mt-1"
              {...form.register("amount")}
            />
          </div>
        </div>

        {/* Persona selector */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">
            Choose Your Interviewer
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => form.setValue("persona", p.id)}
                className={cn(
                  "card-border p-4 text-left rounded-2xl transition-all cursor-pointer",
                  selectedPersona === p.id
                    ? "border-primary-200 bg-dark-300"
                    : "hover:bg-dark-300/50"
                )}
              >
                <span className="text-3xl">{p.avatar}</span>
                <h4 className="text-white font-semibold mt-2">{p.name}</h4>
                <p className="text-xs text-light-400 mt-1">{p.role}</p>
                <p className="text-xs text-light-100 mt-2">{p.description}</p>
              </button>
            ))}
          </div>
          {form.formState.errors.persona && (
            <p className="text-red-400 text-sm">
              {form.formState.errors.persona.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? "Generating Interview…" : "Generate Interview"}
        </Button>
      </form>
    </Form>
  );
};

export default InterviewForm;
