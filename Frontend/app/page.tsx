import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as React from "react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center">
          <div className="font-bold text-2xl text-primary">Study Buddy</div>
          <div className="flex gap-4">
            <Button variant="ghost">About</Button>
            <Button variant="ghost">Features</Button>
            <Button variant="ghost">Contact</Button>
            <Button variant="outline">Sign In</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto flex flex-col md:flex-row items-center justify-center gap-12 px-4 py-16">
        <div className="md:w-1/2 space-y-6">
          <h1 className="text-5xl font-bold leading-tight text-slate-900">
            Transform Your <span className="text-primary">Study Experience</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-md">
            Generate custom questions, create interactive flashcards, and track your learning progress all in one place.
          </p>
          <div className="pt-4">
            <Button size="lg" className="group" asChild>
              <Link href="/dashboard">
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="md:w-1/2">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/40 rounded-2xl blur-xl"></div>
            <div className="relative bg-white p-8 rounded-xl shadow-lg">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Smart Question Generation</h3>
                <p className="text-slate-600">Upload your study materials and get customized questions instantly.</p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Interactive Flashcards</h3>
                <p className="text-slate-600">Create and organize flashcards to reinforce your learning.</p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Progress Tracking</h3>
                <p className="text-slate-600">Monitor your learning journey with detailed analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
