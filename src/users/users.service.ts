import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { RegisterUserDto, LoginUserDto, UpdateUserDto, UserResponse, LoginResponse } from './dto';

@Injectable()
export class UsersService {
    private readonly SALT_ROUNDS = 10;

    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) { }

    async register(dto: RegisterUserDto): Promise<UserResponse> {
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

        return this.toUserResponse(user);
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

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate simple token (for production, use JWT)
        const token = this.generateToken(user._id.toString());

        return {
            user: this.toUserResponse(user),
            token,
        };
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

    private toUserResponse(user: User): UserResponse {
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
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    private generateToken(userId: string): string {
        // Simple token for demo - in production use proper JWT
        return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
    }
}
