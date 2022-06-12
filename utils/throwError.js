exports.throwError = (message) => {
    return {
        statusCode: 400,
        body: message,
        isBase64Encoded: false,
    };
};
