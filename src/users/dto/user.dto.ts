import { Experience, Project } from '../schemas/user.schema';

export class RegisterUserDto {
    fullName: string;
    email: string;
    password: string;
    githubUrl?: string;
    linkedInUrl?: string;
    personalUrl?: string;
    phone?: string;
    experience?: Experience[];
    projects?: Project[];
}

export class LoginUserDto {
    email: string;
    password: string;
}

export class UpdateUserDto {
    fullName?: string;
    githubUrl?: string;
    linkedInUrl?: string;
    personalUrl?: string;
    email?: string;
    password?: string;
    phone?: string;
    experience?: Experience[];
    projects?: Project[];
}

export interface UserResponse {
    id: string;
    fullName: string;
    githubUrl?: string;
    linkedInUrl?: string;
    personalUrl?: string;
    email: string;
    phone?: string;
    experience: Experience[];
    projects: Project[];
    createdAt: Date;
    updatedAt: Date;
}

export interface LoginResponse {
    user: UserResponse;
    token: string;
}
