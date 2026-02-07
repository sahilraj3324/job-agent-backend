import { Injectable, NotFoundException, ConflictException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { RegisterUserDto, LoginUserDto, UpdateUserDto, UserResponse, LoginResponse } from './dto';

export interface GoogleUserDto {
    googleId: string;
    email: string;
    fullName: string;
    profilePicture?: string;
}

@Injectable()
export class UsersService {
    private readonly SALT_ROUNDS = 10;

    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @Inject(forwardRef(() => JwtService))
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterUserDto): Promise<LoginResponse> {
        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

        // Create user
        const user = await this.userModel.create({
            ...dto,
            password: hashedPassword,
        });

        // Return user with JWT token
        const token = this.generateJwtToken(user);
        return {
            user: this.toUserResponse(user),
            token,
        };
    }

    async login(dto: LoginUserDto): Promise<LoginResponse> {
        // Find user with password field
        const user = await this.userModel
            .findOne({ email: dto.email })
            .select('+password')
            .exec();

        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Check if user has a password (not a Google-only account)
        if (!user.password) {
            throw new UnauthorizedException('This account uses Google login. Please sign in with Google.');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate JWT token
        const token = this.generateJwtToken(user);

        return {
            user: this.toUserResponse(user),
            token,
        };
    }

    async findOrCreateByGoogle(googleUser: GoogleUserDto): Promise<UserResponse> {
        // Check if user exists by googleId
        let user = await this.userModel.findOne({ googleId: googleUser.googleId }).exec();

        if (user) {
            // Update profile picture if changed
            if (googleUser.profilePicture && user.profilePicture !== googleUser.profilePicture) {
                user.profilePicture = googleUser.profilePicture;
                await user.save();
            }
            return this.toUserResponse(user);
        }

        // Check if user exists by email (link accounts)
        user = await this.userModel.findOne({ email: googleUser.email }).exec();

        if (user) {
            // Link Google account to existing user
            user.googleId = googleUser.googleId;
            user.profilePicture = googleUser.profilePicture || user.profilePicture;
            await user.save();
            return this.toUserResponse(user);
        }

        // Create new user
        user = await this.userModel.create({
            googleId: googleUser.googleId,
            email: googleUser.email,
            fullName: googleUser.fullName,
            profilePicture: googleUser.profilePicture,
        });

        return this.toUserResponse(user);
    }

    generateJwtToken(user: User | UserResponse): string {
        const userId = (user as any)._id?.toString() || (user as UserResponse).id;
        const payload = {
            sub: userId,
            email: user.email,
        };
        return this.jwtService.sign(payload);
    }

    async findAll(): Promise<UserResponse[]> {
        const users = await this.userModel.find().exec();
        return users.map(user => this.toUserResponse(user));
    }

    async findById(id: string): Promise<UserResponse> {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return this.toUserResponse(user);
    }

    async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
        const updateData: any = { ...dto };

        // Hash new password if provided
        if (dto.password) {
            updateData.password = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
        }

        const user = await this.userModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .exec();

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.toUserResponse(user);
    }

    async deleteById(id: string): Promise<{ deleted: boolean; id: string }> {
        const result = await this.userModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return { deleted: true, id };
    }

    async deleteAll(): Promise<{ deleted: boolean; count: number }> {
        const result = await this.userModel.deleteMany({}).exec();
        return { deleted: true, count: result.deletedCount };
    }

    toUserResponse(user: User): UserResponse {
        return {
            id: user._id.toString(),
            fullName: user.fullName,
            githubUrl: user.githubUrl,
            linkedInUrl: user.linkedInUrl,
            personalUrl: user.personalUrl,
            email: user.email,
            phone: user.phone,
            experience: user.experience || [],
            projects: user.projects || [],
            profilePicture: user.profilePicture,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
