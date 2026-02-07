import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { UsersService } from './users.service';
import { RegisterUserDto, LoginUserDto, UpdateUserDto, UserResponse, LoginResponse } from './dto';
import { JwtAuthGuard, GoogleAuthGuard } from '../auth/guards';

// Cookie options for JWT token
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiBody({ type: RegisterUserDto })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @ApiResponse({ status: 409, description: 'User with this email already exists' })
    async register(
        @Body() dto: RegisterUserDto,
        @Res({ passthrough: true }) res: any,
    ): Promise<LoginResponse> {
        const result = await this.usersService.register(dto);

        // Set JWT in HTTP-only cookie
        res.cookie('access_token', result.token, COOKIE_OPTIONS);

        return result;
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginUserDto })
    @ApiResponse({ status: 200, description: 'Login successful, returns user and sets cookie' })
    @ApiResponse({ status: 401, description: 'Invalid email or password' })
    async login(
        @Body() dto: LoginUserDto,
        @Res({ passthrough: true }) res: any,
    ): Promise<LoginResponse> {
        const result = await this.usersService.login(dto);

        // Set JWT in HTTP-only cookie
        res.cookie('access_token', result.token, COOKIE_OPTIONS);

        return result;
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({ summary: 'Initiate Google OAuth login' })
    @ApiResponse({ status: 302, description: 'Redirects to Google login' })
    async googleAuth() {
        // Guard handles the redirect to Google
    }

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({ summary: 'Google OAuth callback' })
    @ApiResponse({ status: 302, description: 'Redirects with JWT cookie set' })
    async googleAuthCallback(
        @Req() req: any,
        @Res() res: any,
    ) {
        const user = req.user as UserResponse;
        const token = this.usersService.generateJwtToken(user);

        // Set JWT in HTTP-only cookie
        res.cookie('access_token', token, COOKIE_OPTIONS);

        // Redirect to frontend after successful auth
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/success`);
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout and clear auth cookie' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Res({ passthrough: true }) res: any) {
        res.clearCookie('access_token', { path: '/' });
        return { message: 'Logged out successfully' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current authenticated user' })
    @ApiResponse({ status: 200, description: 'Returns current user' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getCurrentUser(@Req() req: any): Promise<UserResponse> {
        return req.user as UserResponse;
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Returns list of all users' })
    async findAll(): Promise<UserResponse[]> {
        return this.usersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Returns user details' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findById(@Param('id') id: string): Promise<UserResponse> {
        return this.usersService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponse> {
        return this.usersService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deleteById(@Param('id') id: string): Promise<{ deleted: boolean; id: string }> {
        return this.usersService.deleteById(id);
    }

    @Delete()
    @ApiOperation({ summary: 'Delete all users' })
    @ApiResponse({ status: 200, description: 'All users deleted' })
    async deleteAll(): Promise<{ deleted: boolean; count: number }> {
        return this.usersService.deleteAll();
    }
}
