import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw an error if user is not authenticated
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, just return null instead of throwing
    // This allows the endpoint to work for both authenticated and unauthenticated users
    if (err || !user) {
      return null;
    }
    return user;
  }
}

