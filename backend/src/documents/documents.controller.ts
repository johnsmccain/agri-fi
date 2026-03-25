import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { DocumentsService } from "./documents.service";
import { User } from "../auth/entities/user.entity";

interface AuthRequest extends Request {
  user: User;
}

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { doc_type: string; trade_deal_id: string },
    @Request() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("File exceeds 10 MB limit");
    }

    if (
      !["application/pdf", "image/png", "image/jpeg"].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        "Unsupported file type. Only PDF, PNG, JPEG allowed",
      );
    }

    return this.documentsService.handleUpload({
      file,
      docType: body.doc_type,
      tradeDealId: body.trade_deal_id,
      userId: req.user.id,
    });
  }
}
