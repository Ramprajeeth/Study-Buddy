"use client"
import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  History,
  Home,
  LogOut,
  Upload,
  CheckCircle,
  X,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  Loader2,
  Trash2,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, onSnapshot, where } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("generate")
  const [showSidebar, setShowSidebar] = useState(true)
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [questionPrefs, setQuestionPrefs] = useState({
    type: "Multiple Choice",
    difficulty: "Medium",
    numQuestions: "10",
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [generatedFlashcards, setGeneratedFlashcards] = useState<any[]>([])
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({})
  const [knownFlashcards, setKnownFlashcards] = useState<boolean[]>([])
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizHistory, setQuizHistory] = useState<any[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [viewingQuiz, setViewingQuiz] = useState<any | null>(null)
  const [topicFlashcards, setTopicFlashcards] = useState<{ [key: string]: any[] }>({})
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [analyticsData, setAnalyticsData] = useState({
    totalQuizzes: 0,
    accuracyRate: 0,
    averageTimePerQuiz: 0,
    totalFlashcardsReviewed: 0,
  })
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [firestoreError, setFirestoreError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}")
      setUser(storedUser)
    }
  }, [])

  useEffect(() => {
    if (user === null) return;
    if (!user?.username) {
      router.push("/")
    }
  }, [user, router])

  useEffect(() => {
    setKnownFlashcards(new Array(generatedFlashcards.length).fill(false))
  }, [generatedFlashcards])

  useEffect(() => {
    if (!user?.username) return;

    console.log("Current generatedFlashcards in state:", generatedFlashcards)
    fetchFlashcards()

    const q = query(
      collection(db, "quizHistory"),
      where("userId", "==", user.username),
      orderBy("submittedAt", "desc")
    )

    const unsubscribeQuiz = onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setQuizHistory(history)
        setFirestoreError(null) // Clear error on success
        updateAnalytics(history)
      },
      (error) => {
        console.error("Error in quizHistory snapshot:", error)
        setFirestoreError(
          "Failed to load quiz history. If this persists, ensure the required Firestore index is created: " +
          "https://console.firebase.google.com/v1/r/project/study-buddy-63a7a/firestore/indexes"
        )
      }
    )

    return () => unsubscribeQuiz()
  }, [user])

  const fetchFlashcards = async () => {
    if (!user?.username) return;
    try {
      const querySnapshot = await getDocs(query(collection(db, "flashcards"), where("userId", "==", user.username)))
      const allFlashcards = querySnapshot.docs.map(doc => doc.data())
      const groupedFlashcards = allFlashcards.reduce((acc: { [key: string]: any[] }, card) => {
        const topic = card.fileId || "Unnamed Topic"
        if (!acc[topic]) acc[topic] = []
        acc[topic].push({ front: card.front, back: card.back })
        return acc
      }, {})
      setTopicFlashcards(groupedFlashcards)
    } catch (error) {
      console.error("Error fetching flashcards:", error)
      alert("Failed to load flashcards. Check console for details.")
    }
  }

  const updateAnalytics = (history: any[]) => {
    const totalQuizzes = history.length
    const totalQuestions = history.reduce((sum, quiz) => sum + quiz.questions.length, 0)
    const correctAnswers = history.reduce((sum, quiz) => sum + quiz.questions.filter((q: any) => q.isCorrect).length, 0)
    const accuracyRate = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const totalTime = history.reduce((sum, quiz) => {
      const submittedAt = new Date(quiz.submittedAt).getTime()
      const startedAt = quiz.startedAt ? new Date(quiz.startedAt).getTime() : submittedAt
      return sum + (submittedAt - startedAt)
    }, 0)
    const averageTimePerQuiz = totalQuizzes > 0 ? Math.round(totalTime / totalQuizzes / 1000 / 60) : 0
    const totalFlashcardsReviewed = Object.values(topicFlashcards).flat().length

    setAnalyticsData({
      totalQuizzes,
      accuracyRate,
      averageTimePerQuiz,
      totalFlashcardsReviewed,
    })
  }

  const handleDeleteHistory = async () => {
    if (!user?.username) return;
    try {
      const querySnapshot = await getDocs(query(collection(db, "quizHistory"), where("userId", "==", user.username)))
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      setQuizHistory([])
      setViewingQuiz(null)
      alert("Quiz history deleted successfully!")
    } catch (error) {
      console.error("Error deleting quiz history:", error)
      alert("Failed to delete quiz history. Check console for details.")
    }
  }

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

  const handleGenerateQuestions = async () => {
    if (!selectedFile || !user?.username) {
      alert("Please upload a file first or ensure you are logged in.")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("questionType", questionPrefs.type)
    formData.append("difficulty", questionPrefs.difficulty)
    formData.append("numQuestions", questionPrefs.numQuestions)
    formData.append("userId", user.username)

    try {
      setIsGenerating(true)
      setUploadProgress(0)
      setQuizStartTime(Date.now())

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

      const validQuestions = questions.filter(q => {
        if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
          console.warn("Invalid question object:", q)
          return false
        }
        return true
      })

      setGeneratedQuestions(validQuestions)
      console.log("Set generatedQuestions:", validQuestions)

      const validFlashcards = flashcards.map(f => ({
        front: f.front || "No front text",
        back: f.back || "No back text",
      }))
      setGeneratedFlashcards(validFlashcards)
      console.log("Set generatedFlashcards:", validFlashcards)

      setTopicFlashcards((prev) => ({
        ...prev,
        [selectedFile?.name || "Generated Topic"]: validFlashcards,
      }))
      setSelectedTopic(selectedFile?.name || "Generated Topic")

      setIsGenerating(false)
      setCurrentQuizQuestion(0)
      setUserAnswers({})
      setQuizSubmitted(false)
      alert("Questions generated successfully! Start the quiz.")
    } catch (error) {
      console.error("Error generating questions:", error)
      setIsGenerating(false)
      alert(`An error occurred: ${error.message}. Check console for details.`)
    }
  }

  const handleAnswerSelect = (questionIdx: number, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: answer,
    }))
  }

  const handleFillInTheBlankAnswer = (questionIdx: number, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: answer,
    }))
  }

  const handleNextQuizQuestion = () => {
    if (currentQuizQuestion < generatedQuestions.length - 1) {
      setCurrentQuizQuestion(currentQuizQuestion + 1)
    }
  }

  const handlePrevQuizQuestion = () => {
    if (currentQuizQuestion > 0) {
      setCurrentQuizQuestion(currentQuizQuestion - 1)
    }
  }

  const handleQuizSubmit = async () => {
    if (!user?.username) return;
    if (Object.keys(userAnswers).length !== generatedQuestions.length) {
      alert("Please answer all questions before submitting.")
      return
    }

    const quizData = {
      fileName: selectedFile?.name || "Unnamed File",
      questions: generatedQuestions.map((q, idx) => ({
        questionText: q.questionText,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswers[idx] || "Not Answered",
        isCorrect: userAnswers[idx] === q.correctAnswer,
      })),
      startedAt: quizStartTime ? new Date(quizStartTime).toISOString() : new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      userId: user.username,
    }

    try {
      await addDoc(collection(db, "quizHistory"), quizData)
      setQuizSubmitted(true)
      setQuizStartTime(null)
      alert("Quiz submitted successfully! Navigate to the History tab to view your quiz performance.")
    } catch (error) {
      console.error("Error submitting quiz:", error)
      alert("Failed to submit quiz. Check console for details.")
    }
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

  const calculateProgress = (topic: string) => {
    const currentCards = topicFlashcards[topic] || []
    if (currentCards.length === 0) return 0
    const knownCount = knownFlashcards.filter(Boolean).length
    return Math.round((knownCount / currentCards.length) * 100)
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
    }
    router.push("/")
  }

  const accuracyChartData = quizHistory.map((quiz, idx) => ({
    name: `Quiz ${idx + 1}`,
    accuracy: quiz.questions.length > 0 ? Math.round((quiz.questions.filter((q: any) => q.isCorrect).length / quiz.questions.length) * 100) : 0,
  }))

  if (user === null) {
    return <div>Loading...</div>
  }

  return (
    <div className={cn("flex h-screen transition-all duration-300", theme === "light" ? "bg-slate-50 text-black" : "bg-black text-gray-200")}>
      <button
        className="fixed z-20 bottom-4 right-4 md:hidden bg-primary text-white p-3 rounded-full shadow-lg"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? <ChevronLeft /> : <ChevronRight />}
      </button>

      <div
        className={cn(
          `fixed inset-y-0 left-0 transform ${
            showSidebar ? "translate-x-0" : "-translate-x-full"
          } md:relative md:translate-x-0 z-10 w-64 shadow-lg transition-transform duration-300 ease-in-out`,
          theme === "light" ? "bg-white" : "bg-gray-900"
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn("p-4 border-b", theme === "light" ? "border-gray-200" : "border-gray-700")}>
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
          </nav>

          <div className={cn("p-4 border-t", theme === "light" ? "border-gray-200" : "border-gray-700")}>
            <Select value={theme} onValueChange={(val: "light" | "dark") => setTheme(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full justify-start mt-2" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className={cn("shadow-sm p-4 sticky top-0 z-10 transition-colors duration-300", theme === "light" ? "bg-white" : "bg-gray-900")}>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </header>

        <main className="p-6">
          {activeTab === "generate" && (
            <div className="space-y-6">
              <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Upload Study Materials</h2>
                  <div
                    className={cn(
                      `border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300`,
                      isDragging ? "border-primary bg-primary/10" : theme === "light" ? "border-slate-300" : "border-gray-600"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm font-medium">Drag and drop your files here, or click to browse</p>
                    <p className="mt-1 text-xs">Supports PDF, PowerPoint, Word, and Text files</p>
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
                      <p className="mt-2 text-sm">Selected: {selectedFile.name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Question Preferences</h2>
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base">Question Type</Label>
                      <Select
                        defaultValue="Multiple Choice"
                        onValueChange={(value) =>
                          setQuestionPrefs((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                          <SelectItem value="Fill in the Blank">Fill in the Blank</SelectItem>
                          <SelectItem value="True/False">True/False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-base">Difficulty Level</Label>
                      <div className="pt-2">
                        <Slider
                          defaultValue={[1]}
                          min={0}
                          max={2}
                          step={1}
                          onValueChange={(value) =>
                            setQuestionPrefs((prev) => ({
                              ...prev,
                              difficulty: ["Easy", "Medium", "Hard"][value[0]],
                            }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
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
                          {[10, 15, 20].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} questions
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full" onClick={handleGenerateQuestions} disabled={isGenerating}>
                      {isGenerating ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        "Generate Questions"
                      )}
                    </Button>

                    {generatedQuestions.length > 0 && !quizSubmitted && !isGenerating && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold">Quiz</h3>
                        <div className={cn("p-4 rounded-lg shadow-sm transition-colors duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                          <p className="text-sm mb-2">
                            {currentQuizQuestion + 1}. {generatedQuestions[currentQuizQuestion].questionText}
                          </p>
                          {generatedQuestions[currentQuizQuestion].type === "Multiple Choice" && (
                            <div className="space-y-2">
                              {generatedQuestions[currentQuizQuestion].options.map((option: string, optIdx: number) => (
                                <div key={optIdx} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`q${currentQuizQuestion}-opt${optIdx}`}
                                    checked={userAnswers[currentQuizQuestion] === option}
                                    onCheckedChange={(checked) =>
                                      checked && handleAnswerSelect(currentQuizQuestion, option)
                                    }
                                  />
                                  <label
                                    htmlFor={`q${currentQuizQuestion}-opt${optIdx}`}
                                    className="text-sm"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                          {generatedQuestions[currentQuizQuestion].type === "Fill in the Blank" && (
                            <div className="space-y-2">
                              <Input
                                value={userAnswers[currentQuizQuestion] || ""}
                                onChange={(e) => handleFillInTheBlankAnswer(currentQuizQuestion, e.target.value)}
                                placeholder="Type your answer here"
                                className={theme === "dark" ? "bg-gray-700 text-gray-200" : ""}
                              />
                            </div>
                          )}
                          {generatedQuestions[currentQuizQuestion].type === "True/False" && (
                            <div className="space-y-2">
                              {["True", "False"].map((option, optIdx) => (
                                <div key={optIdx} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`q${currentQuizQuestion}-opt${optIdx}`}
                                    checked={userAnswers[currentQuizQuestion] === option}
                                    onCheckedChange={(checked) =>
                                      checked && handleAnswerSelect(currentQuizQuestion, option)
                                    }
                                  />
                                  <label
                                    htmlFor={`q${currentQuizQuestion}-opt${optIdx}`}
                                    className="text-sm"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between mt-4">
                            <Button
                              variant="outline"
                              onClick={handlePrevQuizQuestion}
                              disabled={currentQuizQuestion === 0}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleNextQuizQuestion}
                              disabled={currentQuizQuestion === generatedQuestions.length - 1}
                            >
                              Next
                            </Button>
                          </div>
                          {currentQuizQuestion === generatedQuestions.length - 1 && (
                            <Button className="w-full mt-4" onClick={handleQuizSubmit}>
                              Submit Quiz
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {quizSubmitted && (
                      <div className="mt-6 text-center">
                        <p className="text-lg font-semibold">
                          Quiz Submitted!
                        </p>
                        <p className="text-sm mt-2">
                          Navigate to the History tab to view your quiz performance.
                        </p>
                        <Button
                          className="mt-4"
                          onClick={() => setActiveTab("history")}
                        >
                          Go to History
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "flashcards" && (
            <div className="space-y-6">
              {!selectedTopic ? (
                <>
                  <h2 className="text-xl font-semibold">Flashcards</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.keys(topicFlashcards).map((topic) => (
                      <Card
                        key={topic}
                        className={cn(
                          "cursor-pointer hover:shadow-lg transition-all duration-300",
                          theme === "light" ? "bg-white" : "bg-gray-800"
                        )}
                        onClick={() => {
                          setSelectedTopic(topic)
                          setCurrentFlashcard(0)
                          setFlipped(false)
                          setKnownFlashcards(new Array(topicFlashcards[topic].length).fill(false))
                        }}
                      >
                        <CardContent className="p-6">
                          <h3 className="text-lg font-medium">{topic}</h3>
                          <p className="text-sm mt-1">{topicFlashcards[topic].length} flashcards</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{selectedTopic} Flashcards</h2>
                    <Button variant="outline" onClick={() => setSelectedTopic("")}>
                      Back to Topics
                    </Button>
                  </div>
                  <div className="flex flex-col items-center">
                    {topicFlashcards[selectedTopic].length > 0 ? (
                      <>
                        <div className="relative w-full max-w-md h-64 perspective">
                          <div
                            className={cn(
                              `absolute w-full h-full transition-all duration-500 transform-style preserve-3d cursor-pointer`,
                              flipped ? "rotate-y-180" : ""
                            )}
                            onClick={() => setFlipped(!flipped)}
                          >
                            <div className={cn("absolute w-full h-full backface-hidden rounded-xl shadow-lg p-6 flex flex-col", theme === "light" ? "bg-white" : "bg-gray-800")}>
                              <div className="text-sm mb-2">Front</div>
                              <div className="flex-1 flex items-center justify-center text-xl font-medium text-center">
                                {topicFlashcards[selectedTopic][currentFlashcard].front}
                              </div>
                              <div className="text-sm text-center mt-4">Click to flip</div>
                            </div>

                            <div className={cn("absolute w-full h-full backface-hidden rounded-xl shadow-lg p-6 flex flex-col rotate-y-180", theme === "light" ? "bg-white" : "bg-gray-800")}>
                              <div className="text-sm mb-2">Back</div>
                              <div className="flex-1 flex items-center justify-center text-lg text-center">
                                {topicFlashcards[selectedTopic][currentFlashcard].back}
                              </div>
                              <div className="text-sm text-center mt-4">Click to flip</div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm mt-4">
                          Card {currentFlashcard + 1} of {topicFlashcards[selectedTopic].length}
                        </p>
                        <div className="flex gap-4 mt-8">
                          <Button variant="outline" onClick={() => {
                            setFlipped(false)
                            setCurrentFlashcard((prev) => (prev > 0 ? prev - 1 : topicFlashcards[selectedTopic].length - 1))
                          }}>
                            Previous
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setFlipped(false)
                            setCurrentFlashcard((prev) => (prev < topicFlashcards[selectedTopic].length - 1 ? prev + 1 : 0))
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
                              {knownFlashcards.filter(Boolean).length}/{topicFlashcards[selectedTopic].length} cards
                            </span>
                          </div>
                          <Progress value={calculateProgress(selectedTopic)} />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm">No flashcards available for this topic.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">History</h2>
                <Button variant="destructive" onClick={handleDeleteHistory}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All History
                </Button>
              </div>
              {firestoreError ? (
                <div className="text-red-500 text-center">
                  <p>{firestoreError}</p>
                  <p>Please create the index and refresh the page.</p>
                </div>
              ) : (
                <div className={cn("rounded-xl shadow-sm overflow-hidden transition-colors duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                  <div className="divide-y">
                    {quizHistory.map((quiz, idx) => (
                      <div key={idx} className={cn("p-4", theme === "light" ? "hover:bg-slate-50" : "hover:bg-gray-700")}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{quiz.fileName} Quiz</h3>
                            <p className="text-sm">{quiz.questions.length} questions</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm">{new Date(quiz.submittedAt).toLocaleDateString()}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingQuiz(quiz)}
                            >
                              View Your Quiz
                            </Button>
                          </div>
                        </div>
                        {viewingQuiz && viewingQuiz.id === quiz.id && (
                          <div className="mt-4 space-y-4">
                            <h4 className="text-lg font-semibold">Quiz Results</h4>
                            {quiz.questions.map((q: any, qIdx: number) => (
                              <div key={qIdx} className={cn("p-4 rounded-lg transition-colors duration-300", theme === "light" ? "bg-gray-50" : "bg-gray-700")}>
                                <p className="text-sm mb-2">
                                  {qIdx + 1}. {q.questionText} ({q.type})
                                </p>
                                {q.type === "Multiple Choice" && (
                                  <div className="space-y-2">
                                    {q.options.map((option: string, optIdx: number) => (
                                      <div key={optIdx} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`hist-q${qIdx}-opt${optIdx}`}
                                          checked={q.userAnswer === option}
                                          disabled
                                        />
                                        <label
                                          htmlFor={`hist-q${qIdx}-opt${optIdx}`}
                                          className="text-sm"
                                        >
                                          {option}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === "Fill in the Blank" && (
                                  <div className="space-y-2">
                                    <p className="text-sm">Your answer: <span className={q.isCorrect ? "" : "text-red-500"}>{q.userAnswer}</span></p>
                                    <p className="text-sm text-green-500">Correct answer: {q.correctAnswer}</p>
                                  </div>
                                )}
                                {q.type === "True/False" && (
                                  <div className="space-y-2">
                                    {["True", "False"].map((option, optIdx) => (
                                      <div key={optIdx} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`hist-q${qIdx}-opt${optIdx}`}
                                          checked={q.userAnswer === option}
                                          disabled
                                        />
                                        <label
                                          htmlFor={`hist-q${qIdx}-opt${optIdx}`}
                                          className="text-sm"
                                        >
                                          {option}
                                        </label>
                                      </div>
                                    ))}
                                    <p className="text-sm">Your answer: <span className={q.isCorrect ? "" : "text-red-500"}>{q.userAnswer}</span></p>
                                    <p className="text-sm text-green-500">Correct answer: {q.correctAnswer}</p>
                                  </div>
                                )}
                                {q.type === "Multiple Choice" && (
                                  <div className="space-y-2 mt-2">
                                    <p className="text-sm">Your answer: <span className={q.isCorrect ? "" : "text-red-500"}>{q.userAnswer}</span></p>
                                    <p className="text-sm text-green-500">Correct answer: {q.correctAnswer}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                  <CardContent className="p-6">
                    <div className="text-sm">Total Quizzes Taken</div>
                    <div className="text-3xl font-bold mt-1">{analyticsData.totalQuizzes}</div>
                  </CardContent>
                </Card>
                <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                  <CardContent className="p-6">
                    <div className="text-sm">Accuracy Rate</div>
                    <div className="text-3xl font-bold mt-1">{analyticsData.accuracyRate}%</div>
                  </CardContent>
                </Card>
                <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                  <CardContent className="p-6">
                    <div className="text-sm">Avg Time Per Quiz</div>
                    <div className="text-3xl font-bold mt-1">{analyticsData.averageTimePerQuiz} min</div>
                  </CardContent>
                </Card>
                <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                  <CardContent className="p-6">
                    <div className="text-sm">Flashcards Reviewed</div>
                    <div className="text-3xl font-bold mt-1">{analyticsData.totalFlashcardsReviewed}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Study Progress by Topic</h3>
                  <div className="space-y-4">
                    {Object.keys(topicFlashcards).map((topic) => (
                      <div key={topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{topic}</span>
                          <span>{calculateProgress(topic)}%</span>
                        </div>
                        <Progress value={calculateProgress(topic)} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className={cn("transition-all duration-300", theme === "light" ? "bg-white" : "bg-gray-800")}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Accuracy Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accuracyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === "light" ? "#ccc" : "#555"} />
                        <XAxis dataKey="name" stroke={theme === "light" ? "#000" : "#fff"} />
                        <YAxis stroke={theme === "light" ? "#000" : "#fff"} />
                        <Tooltip contentStyle={{ backgroundColor: theme === "light" ? "#fff" : "#333", color: theme === "light" ? "#000" : "#fff" }} />
                        <Bar dataKey="accuracy" fill={theme === "light" ? "#4f46e5" : "#7dd3fc"} />
                      </BarChart>
                    </ResponsiveContainer>
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