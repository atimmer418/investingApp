import { HttpInterceptorFn } from '@angular/common/http';

export const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
  // Only add ngrok header if the request is going to an ngrok URL
  if (req.url.includes('ngrok')) {
    const ngrokReq = req.clone({
      setHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return next(ngrokReq);
  }
  
  return next(req);
};
