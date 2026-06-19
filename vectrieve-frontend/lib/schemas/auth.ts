import * as z from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'A valid corporate email address is required.' }),
  password: z.string()
    .min(8, { message: 'Password must contain at least 8 characters.' })
    .max(72, { message: 'Password cannot exceed 72 characters.' }),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must contain at least 2 characters.' }),
  email: z.string().email({ message: 'A valid corporate email address is required.' }),
  password: z
    .string()
    .min(12, { message: 'Enterprise security policy requires a minimum of 12 characters.' })
    .max(72, { message: 'Password cannot exceed 72 characters due to cryptographic limits.' })
    .regex(/[A-Z]/, { message: 'Cryptographic strength requires at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Cryptographic strength requires at least one numeric digit.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Cryptographic strength requires at least one special character.' }),
  company: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;