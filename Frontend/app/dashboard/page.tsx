"use client"
import * as React from "react"
import { useState, useRef, useEffect } from "react"
import {
  FileText,
  History,
  Home,
  HelpCircle,
  Info,
  LogOut,
  Upload,
  CheckCircle,
  X,
  ChevronRight,
  ChevronLeft,
  BarChart2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("generate")
  const [showSidebar, setShowSidebar] = useState(true)
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [questionPrefs, setQuestionPrefs] = useState({
    types: [] as string[],
    difficulty: 50,
    numQuestions: "10",
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [generatedFlashcards, setGeneratedFlashcards] = useState<any[]>([])
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({})
  const [knownFlashcards, setKnownFlashcards] = useState<boolean[]>([])

  const flashcards = [
    {
      front: "What is Git?",
      back: "Git is a distributed version control system for tracking changes in source code during software development.",
    },
    {
      front: "What is a commit in Git?",
      back: "A commit is a snapshot of your repository at a specific point in time.",
    },
    {
      front: "What is the purpose of branching in Git?",
      back: "Branching allows you to diverge from the main line of development and continue to work without messing with the main line.",
    },
  ]

  useEffect(() => {
    setKnownFlashcards(new Array(generatedFlashcards.length).fill(false))
  }, [generatedFlashcards])

  useEffect(() => {
    console.log("Current generatedFlashcards in state:", generatedFlashcards)
  }, [generatedFlashcards])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && ["application/pdf", "application/msword", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      setSelectedFile(file)
    } else {
      alert("Please upload a PDF, Word, or Text file.")
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const updateQuestionTypes = (type: string, checked: boolean) => {
    setQuestionPrefs((prev) => ({
      ...prev,
      types: checked ? [...prev.types, type] : prev.types.filter((t) => t !== type),
    }))
  }

  const handleGenerateQuestions = async () => {
    if (!selectedFile) {
      alert("Please upload a file first.")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("questionTypes", JSON.stringify(questionPrefs.types))
    formData.append("difficulty", questionPrefs.difficulty.toString())
    formData.append("numQuestions", questionPrefs.numQuestions)

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const response = await fetch("http://localhost:5000/generate-questions", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Backend error response:", errorText)
        throw new Error("Failed to generate questions")
      }

      const { questions, flashcards } = await response.json()
      console.log("Backend response:", JSON.stringify({ questions, flashcards }, null, 2))

      const questionsCollection = collection(db, "generatedQuestions")
      let completed = 0

      const validQuestions = questions.filter(q => {
        if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
          console.warn("Invalid question object:", q)
          return false
        }
        return true
      })

      for (const q of validQuestions) {
        try {
          await addDoc(questionsCollection, {
            question: q.correctAnswer,
            type: q.type || "unknown",
            difficulty: questionPrefs.difficulty,
            createdAt: new Date(),
          })
          completed++
          setUploadProgress(Math.round((completed / validQuestions.length) * 100))
        } catch (firestoreError) {
          console.error("Firestore write error:", firestoreError)
        }
      }

      setGeneratedQuestions(validQuestions)
      console.log("Set generatedQuestions:", validQuestions)

      const validFlashcards = flashcards.map(f => ({
        front: f.front || "No front text",
        back: f.back || "No back text",
      }))
      setGeneratedFlashcards(validFlashcards)
      console.log("Set generatedFlashcards:", validFlashcards)

      setIsUploading(false)
      alert("Questions generated and stored successfully!")
    } catch (error) {
      console.error("Error generating questions:", error)
      setIsUploading(false)
      alert(`An error occurred: ${error.message}. Check console for details.`)
    }
  }

  const handleAnswerSelect = (questionIdx: number, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: answer,
    }))
  }

  const handleKnow = () => {
    setKnownFlashcards((prev) => {
      const newKnown = [...prev]
      newKnown[currentFlashcard] = true
      return newKnown
    })
  }

  const handleDontKnow = () => {
    setKnownFlashcards((prev) => {
      const newKnown = [...prev]
      newKnown[currentFlashcard] = false
      return newKnown
    })
  }

  const calculateProgress = () => {
    if (generatedFlashcards.length === 0) return 0
    const knownCount = knownFlashcards.filter(Boolean).length
    return Math.round((knownCount / generatedFlashcards.length) * 100)
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <button
        className="fixed z-20 bottom-4 right-4 md:hidden bg-primary text-white p-3 rounded-full shadow-lg"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? <ChevronLeft /> : <ChevronRight />}
      </button>

      <div
        className={`fixed inset-y-0 left-0 transform ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 z-10 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="font-bold text-2xl text-primary">Study Buddy</div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("generate")}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("flashcards")}>
              <FileText className="mr-2 h-4 w-4" />
              Flashcards
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("history")}>
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("analytics")}>
              <BarChart2 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Info className="mr-2 h-4 w-4" />
              About
            </Button>
          </nav>

          <div className="p-4 border-t">
            <Button variant="outline" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        </header>

        <main className="p-6">
          {activeTab === "generate" && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Upload Study Materials</h2>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center ${
                      isDragging ? "border-primary bg-primary/10" : "border-slate-300"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 mx-auto text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      Drag and drop your files here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Supports PDF, PowerPoint, Word, and Text files</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                    <Button className="mt-4" onClick={handleBrowseClick}>
                      Browse Files
                    </Button>
                    {selectedFile && (
                      <p className="mt-2 text-sm text-slate-700">Selected: {selectedFile.name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Question Preferences</h2>
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base">Question Types</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {["Multiple Choice", "Fill in the Blank", "Open Ended", "True/False"].map((label, idx) => (
                          <div className="flex items-center space-x-2" key={idx}>
                            <Checkbox
                              id={label.toLowerCase().replace(/\s+/g, "-")}
                              onCheckedChange={(checked) =>
                                updateQuestionTypes(label, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={label.toLowerCase().replace(/\s+/g, "-")}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base">Difficulty Level</Label>
                      <div className="pt-2">
                        <Slider
                          defaultValue={[50]}
                          max={100}
                          step={1}
                          onValueChange={(value) =>
                            setQuestionPrefs((prev) => ({ ...prev, difficulty: value[0] }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-xs text-slate-500">
                          <span>Easy</span>
                          <span>Medium</span>
                          <span>Hard</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base" htmlFor="num-questions">
                        Number of Questions
                      </Label>
                      <Select
                        defaultValue="10"
                        onValueChange={(value) =>
                          setQuestionPrefs((prev) => ({ ...prev, numQuestions: value }))
                        }
                      >
                        <SelectTrigger id="num-questions" className="mt-2">
                          <SelectValue placeholder="Select number of questions" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} questions
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full" onClick={handleGenerateQuestions}>
                      Generate Questions
                    </Button>

                    {generatedQuestions.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold">Generated Questions</h3>
                        <div className="space-y-4 mt-2">
                          {generatedQuestions.map((q, idx) => (
                            <div key={idx} className="p-4 bg-white rounded-lg shadow-sm">
                              <p className="text-sm text-slate-700 mb-2">
                                {idx + 1}. {q.questionText}
                              </p>
                              {q.options && q.options.length > 0 ? (
                                <div className="space-y-2">
                                  {q.options.map((option: string, optIdx: number) => (
                                    <div key={optIdx} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`q${idx}-opt${optIdx}`}
                                        checked={userAnswers[idx] === option}
                                        onCheckedChange={(checked) =>
                                          checked && handleAnswerSelect(idx, option)
                                        }
                                      />
                                      <label
                                        htmlFor={`q${idx}-opt${optIdx}`}
                                        className="text-sm text-slate-600"
                                      >
                                        {option}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500">No options available</p>
                              )}
                              {userAnswers[idx] && (
                                <p className="text-sm mt-2">
                                  Your answer: {userAnswers[idx]} 
                                  {userAnswers[idx] === q.correctAnswer ? " (Correct)" : " (Incorrect)"}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "flashcards" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Flashcards</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Create New</Button>
                  <Select defaultValue="git">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="git">Git Basics</SelectItem>
                      <SelectItem value="react">React Fundamentals</SelectItem>
                      <SelectItem value="python">Python Syntax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col items-center">
                {generatedFlashcards.length > 0 ? (
                  <>
                    <div className="relative w-full max-w-md h-64 perspective">
                      <div
                        className={`absolute w-full h-full transition-all duration-500 transform-style preserve-3d cursor-pointer ${flipped ? "rotate-y-180" : ""}`}
                        onClick={() => setFlipped(!flipped)}
                      >
                        <div className="absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg p-6 flex flex-col">
                          <div className="text-sm text-slate-500 mb-2">Front</div>
                          <div className="flex-1 flex items-center justify-center text-xl font-medium text-center">
                            {generatedFlashcards[currentFlashcard].front}
                          </div>
                          <div className="text-sm text-slate-400 text-center mt-4">Click to flip</div>
                        </div>

                        <div className="absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg p-6 flex flex-col rotate-y-180">
                          <div className="text-sm text-slate-500 mb-2">Back</div>
                          <div className="flex-1 flex items-center justify-center text-lg text-center">
                            {generatedFlashcards[currentFlashcard].back}
                          </div>
                          <div className="text-sm text-slate-400 text-center mt-4">Click to flip</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-4">
                      Card {currentFlashcard + 1} of {generatedFlashcards.length}
                    </p>
                  </>
                ) : (
                  <div className="relative w-full max-w-md h-64 perspective">
                    <div
                      className={`absolute w-full h-full transition-all duration-500 transform-style preserve-3d cursor-pointer ${flipped ? "rotate-y-180" : ""}`}
                      onClick={() => setFlipped(!flipped)}
                    >
                      <div className="absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg p-6 flex flex-col">
                        <div className="text-sm text-slate-500 mb-2">Front</div>
                        <div className="flex-1 flex items-center justify-center text-xl font-medium text-center">
                          {flashcards[currentFlashcard].front}
                        </div>
                        <div className="text-sm text-slate-400 text-center mt-4">Click to flip</div>
                      </div>

                      <div className="absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg p-6 flex flex-col rotate-y-180">
                        <div className="text-sm text-slate-500 mb-2">Back</div>
                        <div className="flex-1 flex items-center justify-center text-lg text-center">
                          {flashcards[currentFlashcard].back}
                        </div>
                        <div className="text-sm text-slate-400 text-center mt-4">Click to flip</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  <Button variant="outline" onClick={() => {
                    setFlipped(false)
                    setCurrentFlashcard((prev) => (prev > 0 ? prev - 1 : (generatedFlashcards.length > 0 ? generatedFlashcards.length - 1 : flashcards.length - 1)))
                  }}>
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setFlipped(false)
                    setCurrentFlashcard((prev) => (prev < (generatedFlashcards.length > 0 ? generatedFlashcards.length - 1 : flashcards.length - 1) ? prev + 1 : 0))
                  }}>
                    Next
                  </Button>
                </div>

                <div className="flex gap-4 mt-4">
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleDontKnow}>
                    <X className="h-4 w-4" /> Don't Know
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleKnow}>
                    <CheckCircle className="h-4 w-4" /> Know
                  </Button>
                </div>

                <div className="w-full max-w-md mt-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>
                      {knownFlashcards.filter(Boolean).length}/{generatedFlashcards.length || flashcards.length} cards
                    </span>
                  </div>
                  <Progress value={calculateProgress()} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">History</h2>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="divide-y">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="p-4 hover:bg-slate-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Git Basics Quiz</h3>
                          <p className="text-sm text-slate-500">10 questions • Multiple Choice</p>
                        </div>
                        <div className="text-sm text-slate-500">April 1, 2025</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm text-slate-500">Total Questions</div>
                    <div className="text-3xl font-bold mt-1">248</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm text-slate-500">Flashcards Created</div>
                    <div className="text-3xl font-bold mt-1">124</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm text-slate-500">Accuracy Rate</div>
                    <div className="text-3xl font-bold mt-1">78%</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Study Progress by Topic</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Git Basics</span>
                        <span>85%</span>
                      </div>
                      <Progress value={85} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>React Fundamentals</span>
                        <span>62%</span>
                      </div>
                      <Progress value={62} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Python Syntax</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}