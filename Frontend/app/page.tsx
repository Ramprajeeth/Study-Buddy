"use client"
import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()

  const handleLogin = () => {
    setIsAnimating(true)
    setError("")
    setTimeout(() => {
      if (username === "rohan" && password === "ram") {
        localStorage.setItem("user", JSON.stringify({ username: "rohan" }))
        router.push("/dashboard")
      } else {
        setError("Incorrect username or password")
      }
      setIsAnimating(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col">
      <header className="p-6">
        <h1 className="text-3xl font-bold text-blue-600">Study Buddy</h1>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <Card className={cn("w-full max-w-md transition-all duration-300", isAnimating ? "scale-95 opacity-75" : "scale-100 opacity-100")}>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={isAnimating}
              >
                {isAnimating ? "Logging in..." : "Login"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <section className="p-6 bg-white shadow-inner">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800">What Study Buddy Does</h2>
            <p className="mt-2 text-gray-600">Your ultimate companion for smarter studying</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4">
              <h3 className="text-lg font-medium text-blue-600">Generate Questions</h3>
              <p className="mt-2 text-gray-600">Upload your study materials and get custom questions tailored to your content.</p>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium text-blue-600">Flashcards</h3>
              <p className="mt-2 text-gray-600">Create and review flashcards to reinforce your learning efficiently.</p>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium text-blue-600">Track Progress</h3>
              <p className="mt-2 text-gray-600">Monitor your performance with real-time analytics and insights.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}