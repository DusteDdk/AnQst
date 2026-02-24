export type User = {
    userId: string
    userName: string
    userAge: number
    userRoles: number[]
}

export type PasswordPolicy = {
    minLen: number;
    specialChars: boolean;
}

export type UserCreationResult = {
    success: boolean;
    message: string;
    userId?: string;
}