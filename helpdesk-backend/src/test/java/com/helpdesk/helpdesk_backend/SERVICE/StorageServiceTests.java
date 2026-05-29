package com.helpdesk.helpdesk_backend.SERVICE;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.net.URLDecoder;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;

class StorageServiceTests {

	@Test
	void uploadFileFallsBackToLocalStorageWhenAzureIsUnavailable(@TempDir Path tempDir) {
		StorageService storageService = new StorageService(
				"invalid-connection-string",
				"attachments",
				tempDir.toString());

		MockMultipartFile file = new MockMultipartFile(
				"file",
				"invoice.pdf",
				"application/pdf",
				"fake-pdf-content".getBytes(StandardCharsets.UTF_8));

		String url = storageService.uploadFile(file, "tickets/123");

		assertTrue(url.startsWith("/uploads/tickets/123/"));
		assertTrue(url.endsWith(".pdf"));
		assertEquals(1, countFiles(tempDir));
	}

	@Test
	void uploadFileUsesAzureBlobStorageWhenConfigured(@TempDir Path tempDir) throws IOException {
		String connectionString = System.getenv("AZURE_STORAGE_CONNECTION_STRING");
		assumeTrue(connectionString != null && !connectionString.isBlank(),
				"AZURE_STORAGE_CONNECTION_STRING is required for the live Azure smoke test");

		BlobServiceClient serviceClient = new BlobServiceClientBuilder()
				.connectionString(connectionString)
				.buildClient();
		serviceClient.getBlobContainerClient("attachments").createIfNotExists();

		StorageService storageService = new StorageService(
				connectionString,
				"attachments",
				tempDir.toString());

		MockMultipartFile file = new MockMultipartFile(
				"file",
				"receipt.txt",
				"text/plain",
				"azure-smoke-test".getBytes(StandardCharsets.UTF_8));

		String url = storageService.uploadFile(file, "tickets/azure-smoke");

		assertTrue(url.startsWith("https://"), "Azure upload should return a blob URL");
		assertTrue(url.contains("/attachments/"), "Blob URL should point at the attachments container");

		String blobName = URLDecoder.decode(
				url.substring(url.indexOf("/attachments/") + "/attachments/".length()),
				StandardCharsets.UTF_8);
		BlobClient blobClient = serviceClient.getBlobContainerClient("attachments").getBlobClient(blobName);
		assertTrue(waitForBlobExists(blobClient), "Uploaded blob should exist in Azure Storage");
		blobClient.deleteIfExists();
	}

	private long countFiles(Path tempDir) {
		try (var stream = Files.walk(tempDir)) {
			return stream.filter(Files::isRegularFile).count();
		} catch (IOException ex) {
			throw new RuntimeException("Failed to inspect fallback upload directory", ex);
		}
	}

	private boolean waitForBlobExists(BlobClient blobClient) {
		for (int attempt = 0; attempt < 20; attempt++) {
			if (blobClient.exists()) {
				return true;
			}

			try {
				Thread.sleep(250L);
			} catch (InterruptedException ex) {
				Thread.currentThread().interrupt();
				throw new RuntimeException("Interrupted while waiting for Azure blob upload to become visible", ex);
			}
		}

		return false;
	}
}