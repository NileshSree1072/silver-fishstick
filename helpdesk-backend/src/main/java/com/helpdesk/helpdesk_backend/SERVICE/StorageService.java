package com.helpdesk.helpdesk_backend.SERVICE;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

import com.azure.storage.blob.BlobClientBuilder;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.util.Objects;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class StorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "doc", "docx",
            "xls", "xlsx", "ppt", "pptx", "zip");

    private final BlobContainerClient containerClient;
    private final String uploadDir;
    private final boolean useAzure;

    public StorageService(
            @Value("${app.azure.storage.connection-string}") String connectionString,
            @Value("${app.azure.storage.container-name:attachments}") String containerName,
            @Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadDir = uploadDir;
        
        BlobContainerClient client = null;
        boolean azureActive = false;
        if (connectionString != null && !connectionString.isBlank() && !connectionString.startsWith("${")) {
            try {
                BlobServiceClient serviceClient = new BlobServiceClientBuilder()
                        .connectionString(connectionString)
                        .buildClient();
                client = serviceClient.getBlobContainerClient(containerName);
                // Trigger exists check to fail fast if credentials/connection invalid
                client.exists();
                azureActive = true;
                log.info("Successfully connected to Azure Blob Storage container: {}", containerName);
            } catch (Exception e) {
                log.warn("Azure Blob Storage initialization failed, falling back to local storage: {}", e.getMessage());
            }
        } else {
            log.info("Azure Storage connection string not configured. Using local storage.");
        }
        
        this.containerClient = client;
        this.useAzure = azureActive;
    }

    public String uploadFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is required");
        }

        String originalName = StringUtils.cleanPath(
            Objects.requireNonNullElse(file.getOriginalFilename(), "file"));

        if (originalName.contains("..")) {
            throw new RuntimeException("Invalid file name");
        }

        String extension = getExtension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new RuntimeException("File type not allowed");
        }

        String safeFolder = sanitizeFolder(folder);
        String storedName = UUID.randomUUID() + "." + extension;
        String blobPath = safeFolder + "/" + storedName;

        if (useAzure && containerClient != null) {
            try {
                BlobClient blobClient = containerClient.getBlobClient(blobPath);
                blobClient.upload(file.getInputStream(), file.getSize(), true);
                blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(getContentType(extension)));
                return blobClient.getBlobUrl();
            } catch (Exception ex) {
                log.warn("Azure Blob Storage upload failed for file {}, falling back to local storage: {}", originalName, ex.getMessage());
            }
        }

        // Local storage fallback
        try {
            java.nio.file.Path targetDir = Paths.get(uploadDir, safeFolder);
            java.nio.file.Files.createDirectories(targetDir);
            java.nio.file.Path targetFile = targetDir.resolve(storedName);
            java.nio.file.Files.copy(file.getInputStream(), targetFile, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            
            log.info("Successfully saved file locally: {}/{}", safeFolder, storedName);
            return "/uploads/" + safeFolder + "/" + storedName;
        } catch (Exception localEx) {
            log.error("Local storage upload failed for file " + originalName, localEx);
            throw new RuntimeException("Failed to store file locally", localEx);
        }
    }

    public StoredFile readFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new RuntimeException("File URL is required");
        }

        if (fileUrl.startsWith("/uploads/")) {
            try {
                Path path = Paths.get(uploadDir, fileUrl.substring("/uploads/".length()).replace("/", java.io.File.separator));
                byte[] content = Files.readAllBytes(path);
                String fileName = path.getFileName().toString();
                return new StoredFile(content, getContentTypeFromName(fileName), fileName);
            } catch (Exception ex) {
                throw new RuntimeException("Failed to read local file", ex);
            }
        }

        try {
            BlobClient blobClient = new BlobClientBuilder().endpoint(fileUrl).buildClient();
            byte[] content = blobClient.downloadContent().toBytes();
            String fileName = extractFileNameFromUrl(fileUrl);
            String contentType = blobClient.getProperties().getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = getContentTypeFromName(fileName);
            }
            return new StoredFile(content, contentType, fileName);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to read remote file", ex);
        }
    }

    private String getExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            throw new RuntimeException("File extension is required");
        }
        return fileName.substring(dotIndex + 1);
    }

    private String sanitizeFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return "general";
        }
        return folder.replace("\\", "/")
                .replaceAll("^/+", "")
                .replaceAll("[^a-zA-Z0-9/_-]", "_");
    }

    private String getContentType(String extension) {
        return switch (extension.toLowerCase()) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "bmp" -> "image/bmp";
            case "svg" -> "image/svg+xml";
            case "pdf" -> "application/pdf";
            case "txt" -> "text/plain; charset=utf-8";
            default -> "application/octet-stream";
        };
    }

    private String getContentTypeFromName(String fileName) {
        return getContentType(getExtension(fileName));
    }

    private String extractFileNameFromUrl(String fileUrl) {
        String withoutQuery = fileUrl.split("\\?")[0];
        int lastSlash = withoutQuery.lastIndexOf('/');
        return lastSlash >= 0 ? withoutQuery.substring(lastSlash + 1) : withoutQuery;
    }

    public static record StoredFile(byte[] content, String contentType, String fileName) {}
}
