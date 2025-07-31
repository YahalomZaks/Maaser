"use client";

import { AlertCircle, Check, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { signUpAction } from "@/actions/auth.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import SocialLogin from "./SocialLogin";

// Password validation function
const validatePassword = (password: string) => {
	const checks = {
		length: password.length >= 6,
		lowercase: /[a-z]/.test(password),
		uppercase: /[A-Z]/.test(password),
		number: /\d/.test(password),
		special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
	};
	
	const score = Object.values(checks).filter(Boolean).length;
	return { checks, score, isValid: checks.length && score >= 3 };
};

export function SignupForm() {
	const [state, action, pending] = useActionState(signUpAction, undefined);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: ""
	});
	const [passwordValidation, setPasswordValidation] = useState(validatePassword(""));
	const [showPasswordHelp, setShowPasswordHelp] = useState(false);

	useEffect(() => {
		if (state?.success) {
			toast.success(state.message);
			// Clear form only on success
			setFormData({
				name: "",
				email: "",
				password: "",
				confirmPassword: ""
			});
		}

		if (state?.error) {
			toast.error(state.error, {
				icon: <AlertCircle className="h-4 w-4" />,
			});
			// Don't clear form on error - keep user's data
		}
	}, [state]);

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		
		if (field === "password") {
			setPasswordValidation(validatePassword(value));
		}
	};

	const handleSubmit = (formData: FormData) => {
		// The form should already have the correct values since we're using controlled inputs
		console.log("Form submission data:", {
			name: formData.get("name"),
			email: formData.get("email"),
			password: formData.get("password") ? "***" : "(empty)",
			confirmPassword: formData.get("confirmPassword") ? "***" : "(empty)"
		});
		
		action(formData);
	};

	return (
		<div className="flex flex-col gap-6">
			<Card className="overflow-hidden">
				<CardContent className="max-w-lg mx-auto w-full">
					<form className="md:p-8" action={handleSubmit}>
						<div className="flex flex-col gap-6">
							<div className="flex flex-col items-center text-center">
								<h1 className="text-2xl font-bold">Create an account</h1>
								<p className="text-balance text-muted-foreground">Sign up to get started</p>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="name">Full Name</Label>
								<Input 
									id="name" 
									type="text" 
									name="name" 
									value={formData.name}
									onChange={(e) => handleInputChange("name", e.target.value)}
									disabled={pending} 
									placeholder="John Doe" 
									required 
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="email">Email</Label>
								<Input 
									id="email" 
									type="email" 
									name="email" 
									value={formData.email}
									onChange={(e) => handleInputChange("email", e.target.value)}
									disabled={pending} 
									placeholder="m@example.com" 
									required 
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="password">Password</Label>
								<Input 
									id="password" 
									name="password" 
									type="password" 
									value={formData.password}
									onChange={(e) => handleInputChange("password", e.target.value)}
									onFocus={() => setShowPasswordHelp(true)}
									disabled={pending} 
									required 
								/>
								{showPasswordHelp && (
									<div className="mt-2 p-3 bg-muted rounded-md text-sm">
										<div className="flex items-center gap-2 mb-2">
											<span className="font-medium">Password requirements:</span>
											{passwordValidation.isValid ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<X className="h-4 w-4 text-red-500" />
											)}
										</div>
										<div className="space-y-1">
											<div className={`flex items-center gap-2 ${passwordValidation.checks.length ? 'text-green-600' : 'text-red-600'}`}>
												{passwordValidation.checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
												<span>At least 6 characters</span>
											</div>
											<div className={`flex items-center gap-2 ${passwordValidation.checks.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
												{passwordValidation.checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
												<span>Lowercase letter</span>
											</div>
											<div className={`flex items-center gap-2 ${passwordValidation.checks.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
												{passwordValidation.checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
												<span>Uppercase letter</span>
											</div>
											<div className={`flex items-center gap-2 ${passwordValidation.checks.number ? 'text-green-600' : 'text-gray-500'}`}>
												{passwordValidation.checks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
												<span>Number</span>
											</div>
											<div className={`flex items-center gap-2 ${passwordValidation.checks.special ? 'text-green-600' : 'text-gray-500'}`}>
												{passwordValidation.checks.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
												<span>Special character</span>
											</div>
										</div>
									</div>
								)}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<Input 
									id="confirmPassword" 
									name="confirmPassword" 
									type="password" 
									value={formData.confirmPassword}
									onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
									required 
								/>
								{formData.confirmPassword && formData.password !== formData.confirmPassword && (
									<div className="flex items-center gap-2 text-red-600 text-sm mt-1">
										<X className="h-3 w-3" />
										<span>Passwords do not match</span>
									</div>
								)}
								{formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
									<div className="flex items-center gap-2 text-green-600 text-sm mt-1">
										<Check className="h-3 w-3" />
										<span>Passwords match</span>
									</div>
								)}
							</div>
							<Button 
								type="submit" 
								className="w-full" 
								disabled={pending || !passwordValidation.isValid || formData.password !== formData.confirmPassword}
							>
								{pending ? "Signing up..." : "Sign Up"}
							</Button>
							{/* Social login will be enabled when you add Google/GitHub credentials to .env */}
							<div className="text-center text-sm">
								Already have an account?{" "}
								<Link href="/signin" className="underline underline-offset-4">
									Sign in
								</Link>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
