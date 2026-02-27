export interface JwtAccessPayload {
    sub: string
    email: string
    role: string
    name: string
    username: string
    type: "access"
}

export interface JwtRefreshPayload {
    sub: string
    type: "refresh"
}

export interface JwtForgotPasswordPayload {
    sub: string
    type: "forgotPassword"
}
