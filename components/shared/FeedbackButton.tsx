"use client";

import { useState } from "react";
import { MessageCircle, X, Bug, Lightbulb, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FeedbackButtonProps {
  className?: string;
}

const FeedbackButton = ({ className = "" }: FeedbackButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"select" | "form">("select");
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would normally send the feedback to your API
    console.log("Feedback submitted:", {
      type: feedbackType,
      ...formData
    });
    
    // Show success message
    alert("תודה על המשוב! נשמח לעזור ולשמוע את ההצעות שלכם");
    
    // Reset form
    setIsOpen(false);
    setStep("select");
    setFeedbackType(null);
    setFormData({ name: "", email: "", message: "" });
  };

  const handleTypeSelect = (type: "bug" | "feature") => {
    setFeedbackType(type);
    setStep("form");
  };

  const reset = () => {
    setStep("select");
    setFeedbackType(null);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="welcome-feedback-btn"
        title="יש הצעה או שאלה? נשמח לשמוע"
      >
        <i className="fas fa-comment-dots"></i>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {step === "select" ? "דיווח ומשוב" : 
                 feedbackType === "bug" ? "דיווח על תקלה" : "הצעת שיפור"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === "select" && (
              <div className="p-6 space-y-4">
                <p className="text-muted-foreground mb-6">
                  איך נוכל לעזור לכם?
                </p>
                
                <Button
                  onClick={() => handleTypeSelect("bug")}
                  variant="outline"
                  className="w-full h-16 flex items-center gap-4 text-right"
                >
                  <Bug className="h-6 w-6 text-red-500" />
                  <div className="text-right">
                    <div className="font-semibold">דיווח על תקלה</div>
                    <div className="text-sm text-muted-foreground">
                      משהו לא עובד כמו שצריך?
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleTypeSelect("feature")}
                  variant="outline"
                  className="w-full h-16 flex items-center gap-4 text-right"
                >
                  <Lightbulb className="h-6 w-6 text-yellow-500" />
                  <div className="text-right">
                    <div className="font-semibold">הצעת שיפור</div>
                    <div className="text-sm text-muted-foreground">
                      יש לכם רעיון לשיפור?
                    </div>
                  </div>
                </Button>
              </div>
            )}

            {step === "form" && (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם מלא *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="השם שלכם"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">כתובת אימייל *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="email@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">תוכן ההודעה *</Label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    required
                    maxLength={1000}
                    className="w-full min-h-32 p-3 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={
                      feedbackType === "bug" 
                        ? "תאר את התקלה בפירוט, מתי קרתה ואיך לשחזר אותה"
                        : "תאר את ההצעה לשיפור בפירוט"
                    }
                  />
                  <div className="text-xs text-muted-foreground text-left">
                    {formData.message.length}/1000 תווים
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    שלח
                  </Button>
                  <Button type="button" variant="outline" onClick={reset}>
                    חזור
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                    ביטול
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
