-- Memory Makers · baseline migration (0_init)
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "phone" TEXT,
  "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "OtpToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OtpToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Template" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "keywords" TEXT NOT NULL DEFAULT '[]',
  "blankImage" TEXT,
  "demoImage" TEXT,
  "demoPhotos" TEXT NOT NULL DEFAULT '[]',
  "demoPages" TEXT NOT NULL DEFAULT '[]',
  "coverImage" TEXT,
  "previewGif" TEXT,
  "previewVideo" TEXT,
  "pages" TEXT NOT NULL DEFAULT '[]',
  "canvaLink" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT '',
  "slots" INTEGER NOT NULL DEFAULT 4,
  "pageCount" INTEGER NOT NULL DEFAULT 0,
  "priceDigital" INTEGER NOT NULL DEFAULT 150000,
  "priceSoft" INTEGER NOT NULL DEFAULT 290000,
  "priceHard" INTEGER NOT NULL DEFAULT 450000,
  "priceFan" INTEGER NOT NULL DEFAULT 520000,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DESIGNING',
  "photos" TEXT NOT NULL DEFAULT '[]',
  "layout" TEXT,
  "mode" TEXT,
  "option" TEXT,
  "amount" INTEGER,
  "address" TEXT,
  "tracking" TEXT NOT NULL DEFAULT '',
  "rating" INTEGER,
  "review" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Project_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "fromAdmin" BOOLEAN NOT NULL DEFAULT false,
  "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
  "readByUser" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Setting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
