import logging
import time
import json

logger = logging.getLogger('api_access')

class APIAccessLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        start_time = time.time()
        operation_key = '-'  # operation name
        ga = '-'  # species
        te_dup = '-' # TE subfamily/copy name
        try:
            body = json.loads(request.body)
            operation_key = body.get('key', '-')
            ga = body.get('ga', '-')
            te_dup = body.get('te_dup', '-')
        except Exception:
            pass

        ip = request.META.get('HTTP_X_FORWARDED_FOR',
                               request.META.get('REMOTE_ADDR', '-'))

        response = self.get_response(request)
        elapsed = round((time.time() - start_time) * 1000)
        logger.info(
            f'{ip} "{request.method} {request.path}" '
            f'key={operation_key} ga={ga} te_dup={te_dup} '
            f'status={response.status_code} time={elapsed}ms'
        )
        return response