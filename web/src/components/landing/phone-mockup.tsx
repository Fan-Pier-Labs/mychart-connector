"use client";

import { Icon } from "@iconify/react";

export function PhoneMockup() {
  return (
    <div className="relative w-[340px] h-[720px] mx-auto transform-gpu transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] animate-[float_6s_ease-in-out_infinite]">
      {/* Side Buttons */}
      <div className="absolute -left-[9px] top-[122px] w-[9px] h-[28px] bg-[#e2e8f0] rounded-l-lg shadow-[inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(15,23,42,0.15)] border border-white/60 border-r-0 z-0" />
      <div className="absolute -left-[9px] top-[176px] w-[9px] h-[56px] bg-[#e2e8f0] rounded-l-lg shadow-[inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(15,23,42,0.15)] border border-white/60 border-r-0 z-0" />
      <div className="absolute -left-[9px] top-[244px] w-[9px] h-[56px] bg-[#e2e8f0] rounded-l-lg shadow-[inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(15,23,42,0.15)] border border-white/60 border-r-0 z-0" />
      <div className="absolute -right-[9px] top-[190px] w-[9px] h-[78px] bg-[#e2e8f0] rounded-r-lg shadow-[inset_-2px_2px_4px_rgba(255,255,255,0.9),inset_2px_-2px_4px_rgba(15,23,42,0.15)] border border-white/60 border-l-0 z-0" />

      {/* Outer Clay Body */}
      <div className="absolute inset-0 bg-[#e2e8f0] rounded-[3.9rem] shadow-[25px_35px_65px_rgba(15,23,42,0.15),inset_-6px_-6px_16px_rgba(15,23,42,0.08),inset_6px_6px_16px_rgba(255,255,255,0.95)] border-[5px] border-[#f1f5f9] z-0" />

      {/* Inner Screen */}
      <div className="absolute inset-x-[10px] top-[10px] bottom-[10px] bg-white rounded-[3.25rem] overflow-hidden flex flex-col z-10 shadow-[inset_0_0_20px_rgba(15,23,42,0.06)] border border-slate-200/70">
        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[116px] h-[30px] bg-[#0f172a] rounded-full z-50 shadow-[inset_0_-2px_4px_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.12)] flex items-center justify-between px-2.5">
          <div className="w-3 h-3 bg-[#1e293b] rounded-full flex items-center justify-center border border-white/5">
            <div className="w-1 h-1 bg-emerald-500/50 rounded-full blur-[1px]" />
          </div>
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_4px_rgba(16,185,129,0.6)] animate-pulse" />
        </div>

        {/* Status Bar */}
        <div className="h-14 w-full pt-3 px-6 flex justify-between items-center text-[11px] font-semibold text-slate-800 z-40 bg-white">
          <span className="ml-1 tracking-tight">9:41</span>
          <div className="flex gap-1.5 items-center opacity-80 mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V4" /><path d="M22 20V4" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" /><path d="M5 12.859a10 10 0 0 1 14 0" /><path d="M8.5 16.429a5 5 0 0 1 7 0" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="16" height="10" x="2" y="7" rx="2" ry="2" fill="currentColor" /><line x1="22" x2="22" y1="11" y2="13" />
            </svg>
          </div>
        </div>

        {/* Claude UI Header */}
        <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between bg-white z-20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#da7756] flex items-center justify-center text-white font-serif font-medium text-xs">
              C
            </div>
            <span className="font-serif font-medium text-sm text-slate-800">Claude</span>
          </div>
          <Icon icon="solar:hamburger-menu-linear" width={18} height={18} className="text-slate-400" />
        </div>

        {/* Chat Area */}
        <div className="flex-1 px-4 pt-4 pb-16 flex flex-col gap-5 overflow-hidden relative z-10 bg-[#fbfbfa]">
          {/* AI Message */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-md bg-[#da7756] shrink-0 flex items-center justify-center text-white font-serif font-medium text-[10px] mt-0.5">
              C
            </div>
            <p className="text-[13px] text-slate-700 leading-relaxed font-light">
              I&apos;ve connected to your MyChart. You have a new lab result for your Lipid Panel and a message from Dr. Smith. What would you like to view?
            </p>
          </div>

          {/* User Message */}
          <div className="flex gap-3 flex-row-reverse">
            <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-slate-600 text-[10px] mt-0.5">
              <Icon icon="solar:user-rounded-linear" width={12} height={12} />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
              <p className="text-[13px] text-slate-700 leading-relaxed font-light">
                Can you summarize the lab results and book a follow-up with Dr. Smith for next week?
              </p>
            </div>
          </div>

          {/* AI Message with Card */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-md bg-[#da7756] shrink-0 flex items-center justify-center text-white font-serif font-medium text-[10px] mt-0.5">
              C
            </div>
            <div className="flex flex-col gap-3 w-full pr-2">
              <p className="text-[13px] text-slate-700 leading-relaxed font-light">
                Your LDL is slightly elevated compared to last year. I&apos;ve drafted a booking request for next Tuesday at 2:00 PM.
              </p>

              {/* MyChart Widget */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm w-full group transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                    <Icon icon="solar:calendar-date-linear" width={12} height={12} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">
                    Appointment Draft
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 tracking-tight">Dr. Sarah Smith</p>
                <p className="text-[11px] text-slate-500 mb-3">General Practice &bull; Follow-up</p>
                <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between mb-3 border border-slate-100">
                  <span className="text-[12px] font-medium text-slate-700">Tue, Oct 24 &bull; 2:00 PM</span>
                  <Icon icon="solar:pen-linear" width={12} height={12} className="text-slate-400" />
                </div>
                <button className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-medium hover:bg-slate-800 transition-colors">
                  Confirm &amp; Book
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-4 left-4 right-4 bg-white border border-slate-200 rounded-full h-10 px-4 flex items-center justify-between shadow-sm z-20">
          <span className="text-[13px] text-slate-400 font-light">Reply to Claude...</span>
          <Icon icon="solar:microphone-2-linear" width={16} height={16} className="text-slate-400" />
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[124px] h-[4px] bg-slate-900/10 rounded-full z-40" />
      </div>
    </div>
  );
}
