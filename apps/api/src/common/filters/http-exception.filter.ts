import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    response.status(status).json({
      code: status,
      data: null,
      message: typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message || 'Error',
    });
  }
}
