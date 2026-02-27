export function generatePendingUserKey(email: string) {
    const key = `pending_user:${email}`
    return key
}
