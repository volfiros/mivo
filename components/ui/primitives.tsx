"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import NextLink from "next/link";
import clsx from "clsx";
import {
  Badge,
  Button,
  Card,
  Link as RadixLink,
  ScrollArea,
  Select,
  Separator,
  Text,
  TextArea,
  TextField
} from "@radix-ui/themes";

type ButtonTone = "primary" | "secondary" | "ghost";
type NextHref = ComponentPropsWithoutRef<typeof NextLink>["href"];
type AppHref = string | NextHref;

function toNextHref(href: AppHref): NextHref {
  return href as NextHref;
}

export function AppPanel({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Card>) {
  return (
    <Card {...props} className={clsx("app-panel", className)}>
      {children}
    </Card>
  );
}

export function AppButton({
  tone = "primary",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Button> & {
  tone?: ButtonTone;
  children: ReactNode;
}) {
  return (
    <Button {...props} data-tone={tone} className={clsx("app-button", className)}>
      {children}
    </Button>
  );
}

export function AppButtonLink({
  tone = "primary",
  href,
  className,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Button>, "asChild" | "children"> & {
  tone?: ButtonTone;
  href: AppHref;
  children: ReactNode;
}) {
  return (
    <Button {...props} asChild data-tone={tone} className={clsx("app-button", className)}>
      <NextLink href={toNextHref(href)}>{children}</NextLink>
    </Button>
  );
}

export function AppNavLink({
  href,
  className,
  children
}: {
  href: AppHref;
  className?: string;
  children: ReactNode;
}) {
  if (className?.includes("brand-mark")) {
    return (
      <NextLink
        href={toNextHref(href)}
        className={clsx("app-nav-link", className)}
      >
        {children}
      </NextLink>
    );
  }

  return (
    <RadixLink asChild className={clsx("app-nav-link", className)}>
      <NextLink href={toNextHref(href)}>{children}</NextLink>
    </RadixLink>
  );
}

export function FieldLabel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Text as="label" size="1" weight="medium" className={clsx("app-field-label", className)}>
      {children}
    </Text>
  );
}

export function AppInput({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TextField.Root>) {
  return <TextField.Root {...props} size="3" className={clsx("app-input", className)} />;
}

export function AppTextArea({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TextArea>) {
  return <TextArea {...props} size="3" className={clsx("app-textarea", className)} />;
}

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} size="3">
      <Select.Trigger
        placeholder={placeholder}
        variant="surface"
        radius="medium"
        className={clsx("app-select-trigger w-full", className)}
      />
      <Select.Content variant="solid" color="gray" className="app-select-content">
        {options.map((option) => (
          <Select.Item key={option.value} value={option.value} className="app-select-item">
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

export function StatusBadge({
  status,
  className,
  label
}: {
  status: string;
  className?: string;
  label?: string;
}) {
  const tone =
    status === "ready" || status === "completed"
      ? "status-ready"
      : status === "generating" || status === "streaming"
        ? "status-live"
        : status === "failed"
          ? "status-failed"
          : status === "cancelled"
            ? "status-muted"
            : "status-neutral";

  return (
    <Badge radius="medium" variant="surface" className={clsx("app-badge", tone, className)}>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

export function AppScrollArea({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof ScrollArea>) {
  return (
    <ScrollArea
      {...props}
      scrollbars="vertical"
      type="hover"
      className={clsx("app-scroll-area no-scrollbar", className)}
    >
      {children}
    </ScrollArea>
  );
}

export { Separator };
