"use client";

import { motion } from "framer-motion";
import type { SkillProfile as SkillProfileType, GitHubProfile } from "@/lib/types";
import { LANGUAGE_COLORS } from "@/lib/types";
import { Code, Briefcase, Trophy, Globe } from "lucide-react";

interface SkillProfileProps {
  profile: GitHubProfile;
  skills: SkillProfileType;
}

export function SkillProfile({ profile, skills }: SkillProfileProps) {
  const levelConfig = {
    beginner: { label: "Beginner", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
    intermediate: { label: "Intermediate", color: "text-warning", bg: "bg-warning/10 border-warning/20" },
    advanced: { label: "Advanced", color: "text-success", bg: "bg-success/10 border-success/20" },
  };

  const level = levelConfig[skills.experienceLevel];

  return (
    <motion.div
      className="rounded-xl border border-border bg-surface p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <img
          src={profile.avatar_url}
          alt={profile.login}
          className="w-16 h-16 rounded-xl border border-border"
        />

        <div className="flex-1 min-w-0">
          {/* Name & Level */}
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-text-primary">
              {profile.name || profile.login}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${level.bg} ${level.color}`}>
              <Trophy className="w-3 h-3 inline mr-1 -mt-0.5" />
              {level.label}
            </span>
          </div>

          <p className="text-sm text-text-muted mt-0.5">@{profile.login}</p>

          {/* Summary */}
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {skills.summary}
          </p>

          {/* Tags Grid */}
          <div className="mt-4 space-y-3">
            {/* Languages */}
            <div className="flex items-start gap-2">
              <Code className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {skills.primaryLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border text-text-secondary"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: LANGUAGE_COLORS[lang] || "#6b7280",
                      }}
                    />
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Frameworks */}
            {skills.frameworks.length > 0 && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {skills.frameworks.map((fw) => (
                    <span
                      key={fw}
                      className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border text-text-secondary"
                    >
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Domains */}
            {skills.preferredDomains.length > 0 && (
              <div className="flex items-start gap-2">
                <Globe className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {skills.preferredDomains.map((domain) => (
                    <span
                      key={domain}
                      className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-accent/8 border border-accent/15 text-accent"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
