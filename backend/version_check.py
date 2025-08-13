import sys
import logging

logger = logging.getLogger(__name__)

MIN_SUPPORTED = (3, 9)
MAX_SUPPORTED_EXCLUSIVE = (3, 13)  # 3.13 not yet fully supported by pinned deps

def enforce_python_version():
    v = sys.version_info
    if v < MIN_SUPPORTED:
        raise RuntimeError(f"Python {v.major}.{v.minor} detected. Minimum supported is {MIN_SUPPORTED[0]}.{MIN_SUPPORTED[1]}.")
    if v >= MAX_SUPPORTED_EXCLUSIVE:
        raise RuntimeError(
            f"Python {v.major}.{v.minor} detected. Dependencies may lack wheels. Use Python 3.12.x as specified in runtime.txt."
        )
    logger.info("Python version OK: %s.%s.%s", v.major, v.minor, v.micro)

enforce_python_version()
