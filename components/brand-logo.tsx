import Image from "next/image";

type BrandLogoProps = {
  priority?: boolean;
};

export function BrandLogo({ priority = false }: BrandLogoProps) {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <Image
          src="/brand/volthesap-mark.png"
          alt=""
          width={34}
          height={34}
          priority={priority}
        />
      </span>
      <span>VoltHesap</span>
    </span>
  );
}
