import { Module } from '@nestjs/common';
import { JDParserService } from './jd-parser.service';

@Module({
    providers: [JDParserService],
    exports: [JDParserService],
})
export class JDParserModule { }
