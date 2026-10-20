"use client";

import { useActionState, useState } from "react";
import { signup } from "./actions";
import styles from "./signup.module.css";

const initialState = { error: "" };

function PasswordField({
    name,
    label,
}: {
    name: string;
    label: string;
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className = {styles.field}>
            <label className = {styles.label} htmlFor={name}>
                {label}
            </label>

            <div className = {styles.passwordRow}>
                <input
                    id = {name}
                    name = {name}
                    type = {showPassword ? "text" : "password"}
                    required
                    minLength = {8}
                    autoComplete = "new-password"
                />

                <button
                    type = "button"
                    onClick = {() => setShowPassword(!showPassword)}
                    aria-label = {showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? "Hide" : "Show"}
                </button>
            </div>
        </div>
    );
}

export function SignupForm() {
    const [state, action, pending] = useActionState(signup, initialState);

    return (
        <form action = {action} className = {styles.form}>
            <div className = {styles.field}>
                <label className = {styles.label} htmlFor = "username">
                    Username
                </label>
                <input
                    id = "username"
                    name = "username"
                    type = "text"
                    required
                    minLength = {3}
                    autoComplete = "username"
                />
            </div>

            <PasswordField name = "password" label = "Password" />
            <PasswordField
                name = "confirmPassword"
                label = "Confirm Password"
            />

            {state.error && (
                <p className = {styles.error}>{state.error}</p>
            )}

            <button type = "submit" disabled = {pending}>
                {pending ? "Creating account..." : "Sign Up"}
            </button>
        </form>
    );
}