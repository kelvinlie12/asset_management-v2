
import React from "react";
import GridShape from "../../components/common/GridShape";
import NexoraLogo from "../../components/common/NexoraLogo";

const stats = [
  {
    label: "Asset Management",
    value: "Centralized",
    icon: "◈",
    color: "text-violet-300",
  },
  {
    label: "Team Collaboration",
    value: "Connected",
    icon: "◎",
    color: "text-blue-300",
  },
  {
    label: "System Monitoring",
    value: "Real-time",
    icon: "↗",
    color: "text-emerald-300",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 bg-white p-6 dark:bg-transparent sm:p-0">
      <div className="relative flex min-h-screen w-full flex-col justify-center lg:flex-row sm:p-0">
        {children}

        <div className="relative hidden min-h-screen w-full overflow-hidden border-l border-white/[0.06] bg-[#070a2c] lg:flex lg:w-1/2 lg:items-center lg:justify-center">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 75% 15%, rgba(99,102,241,0.25), transparent 45%),
                radial-gradient(ellipse at 15% 85%, rgba(124,58,237,0.22), transparent 45%),
                linear-gradient(145deg, #070a2c 0%, #0b1035 55%, #100a32 100%)
              `,
            }}
          />

          {/* Grid background */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <GridShape />
          </div>

          {/* Decorative glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.12] blur-[100px]" />

          {/* Main content */}
          <div className="relative z-10 mx-auto w-full max-w-xl px-10 py-12 xl:px-16">
            {/* Brand */}
            <div className="mb-16 flex items-center gap-3">
              <GridShape />
            <div className="flex max-w-xs flex-col items-center">
              <NexoraLogo className="mb-5 scale-125" />
             
            </div>
            </div>

            {/* Headline */}
            <div className="mb-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <span className="text-xs font-medium tracking-wide text-violet-200">
                  SMART ASSET PLATFORM
                </span>
              </div>

              <h2 className="max-w-lg text-4xl font-semibold leading-[1.2] tracking-tight text-white xl:text-5xl">
                Everything you need,
                <span className="block bg-gradient-to-r from-violet-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                  all in one place.
                </span>
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-400 xl:text-base">
                Manage your assets, monitor maintenance, and
                keep your team connected through one centralized
                platform.
              </p>
            </div>

            {/* Glass cards */}
            <div className="space-y-3">
              {stats.map((item, index) => (
                <div
                  key={item.label}
                  className="group flex items-center justify-between rounded-2xl border border-white/[0.09] bg-white/[0.045] p-4 backdrop-blur-xl transition-all duration-300 hover:translate-x-1 hover:border-violet-400/30 hover:bg-white/[0.07]"
                  style={{
                    marginLeft: `${index * 12}px`,
                    marginRight: `${(2 - index) * 12}px`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
                      <span className={`text-2xl ${item.color}`}>
                        {item.icon}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Integrated workspace
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${item.color}`}>
                      {item.value}
                    </span>
                    <span className="text-slate-500">↗</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 flex items-center justify-between border-t border-white/[0.08] pt-5">
              <p className="text-xs text-slate-500">
                Built for smarter operations.
              </p>

              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400">
                  Platform experience
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
